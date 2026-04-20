// Edge Function: ligacao-ia
// Inicia uma ligação automática de confirmação de agendamento.
//
// Fluxo:
//   1. Valida JWT e pertencimento ao tenant.
//   2. Verifica permissão de admin (has_role admin).
//   3. Carrega configuração global (ligacao_ia_config + ligacao_ia_credenciais).
//   4. Verifica toggle global e horário permitido (America/Sao_Paulo).
//   5. Carrega configuração do tenant (configuracoes_ligacao_ia).
//   6. Verifica toggle do tenant.
//   7. Busca dados do agendamento com joins (cliente, serviço, profissional, tenant).
//   8. Idempotência: retorna 409 se já existe ligação para este agendamento.
//   9. Gera áudio com ElevenLabs (eleven_multilingual_v2).
//  10. Faz upload do MP3 no Supabase Storage (bucket ligacoes-audio).
//  11. Insere registro em ligacoes_ia (status='iniciando').
//  12. Inicia ligação via Twilio REST API.
//  13. Atualiza ligacoes_ia com twilio_call_sid (status='em_andamento').
//
// Segurança:
//   - JWT obrigatório; credenciais externas lidas via service_role (bypassa RLS).
//   - Credenciais do ElevenLabs e Twilio ficam APENAS em configuracoes_sistema
//     (chave 'ligacao_ia_credenciais') com RLS super_admin-only.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Payload {
  tenant_id:      string
  agendamento_id: string
}

interface ConfigGlobal {
  ativo:          boolean
  horario_inicio: string  // HH:MM
  horario_fim:    string  // HH:MM
}

interface CredenciaisGlobais {
  elevenlabs_api_key:   string
  elevenlabs_voice_id:  string
  twilio_account_sid:   string
  twilio_auth_token:    string
  twilio_numero:        string
}

interface ConfigTenant {
  ativo:                   boolean
  horas_antecedencia:      number
  telefone_estabelecimento: string | null
}

// ── Script de confirmação (PT-BR) ─────────────────────────────────────────────

const SCRIPT_CONFIRMACAO =
  'Olá, {nome}! Aqui é da {estabelecimento}. ' +
  'Estou ligando para confirmar seu agendamento de {servico} amanhã às {hora}. ' +
  'Para confirmar, pressione 1. ' +
  'Para cancelar, pressione 2. ' +
  'Para falar com a equipe, pressione 3.'

function renderScript(vars: Record<string, string>): string {
  return SCRIPT_CONFIRMACAO.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Validar autenticação via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ erro: 'nao_autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supaUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) return json({ erro: 'token_invalido' }, 401)
    const authUserId = claimsData.claims.sub as string

    // 2. Validar payload
    const body = (await req.json()) as Payload
    if (!body.tenant_id || !body.agendamento_id) {
      return json({ erro: 'payload_invalido', campos_obrigatorios: ['tenant_id', 'agendamento_id'] }, 400)
    }

    const supaAdmin = createClient(supabaseUrl, serviceKey)

    // 3. Verificar pertencimento ao tenant
    const { data: usuarioDB } = await supaAdmin
      .from('usuarios')
      .select('id, tenant_id')
      .eq('auth_user_id', authUserId)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()
    if (!usuarioDB) return json({ erro: 'acesso_negado' }, 403)

    // 4. Verificar que o usuário é admin do tenant
    const { data: isAdmin } = await supaAdmin.rpc('has_role', {
      _user_id: authUserId,
      _role:    'admin',
    })
    if (!isAdmin) return json({ erro: 'sem_permissao', detalhe: 'apenas admins podem iniciar ligações IA' }, 403)

    // 5. Carregar configuração global (config + credenciais) via service_role
    const [{ data: cfgRow }, { data: credsRow }] = await Promise.all([
      supaAdmin
        .from('configuracoes_sistema' as never)
        .select('valor')
        .eq('chave', 'ligacao_ia_config')
        .maybeSingle() as unknown as Promise<{ data: { valor: ConfigGlobal } | null }>,
      supaAdmin
        .from('configuracoes_sistema' as never)
        .select('valor')
        .eq('chave', 'ligacao_ia_credenciais')
        .maybeSingle() as unknown as Promise<{ data: { valor: CredenciaisGlobais } | null }>,
    ])

    const cfgGlobal   = cfgRow?.valor   ?? { ativo: false, horario_inicio: '09:00', horario_fim: '19:00' }
    const credenciais = credsRow?.valor  as CredenciaisGlobais | undefined

    // 6. Verificar toggle global
    if (!cfgGlobal.ativo) {
      return json({ erro: 'ligacao_ia_desativada_globalmente' }, 422)
    }

    // Verificar campos obrigatórios das credenciais
    if (
      !credenciais?.elevenlabs_api_key ||
      !credenciais?.elevenlabs_voice_id ||
      !credenciais?.twilio_account_sid ||
      !credenciais?.twilio_auth_token ||
      !credenciais?.twilio_numero
    ) {
      return json({ erro: 'credenciais_nao_configuradas', detalhe: 'configure ElevenLabs e Twilio no painel super admin' }, 422)
    }

    // 7. Verificar horário permitido (fuso: America/Sao_Paulo)
    const agora      = new Date()
    const horaBrRef  = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const minAtual   = horaBrRef.getHours() * 60 + horaBrRef.getMinutes()
    const [hIni, mIni] = cfgGlobal.horario_inicio.split(':').map(Number)
    const [hFim, mFim] = cfgGlobal.horario_fim.split(':').map(Number)
    const minIni = hIni * 60 + mIni
    const minFim = hFim * 60 + mFim
    if (minAtual < minIni || minAtual >= minFim) {
      return json({
        erro:            'fora_do_horario_permitido',
        horario_inicio:  cfgGlobal.horario_inicio,
        horario_fim:     cfgGlobal.horario_fim,
        hora_atual:      `${horaBrRef.getHours().toString().padStart(2,'0')}:${horaBrRef.getMinutes().toString().padStart(2,'0')}`,
      }, 422)
    }

    // 8. Carregar configuração do tenant
    const { data: cfgTenantRow } = (await supaAdmin
      .from('configuracoes_ligacao_ia' as never)
      .select('ativo, horas_antecedencia, telefone_estabelecimento')
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()) as unknown as { data: ConfigTenant | null }

    if (!cfgTenantRow?.ativo) {
      return json({ erro: 'ligacao_ia_desativada_para_este_tenant' }, 422)
    }

    // 9. Buscar dados do agendamento com joins
    const { data: ag } = await supaAdmin
      .from('agendamentos')
      .select(`
        id, tenant_id, data_hora_inicio, status, cliente_id,
        clientes!cliente_id ( nome, telefone ),
        servicos!servico_id ( nome ),
        usuarios!profissional_id ( nome )
      `)
      .eq('id', body.agendamento_id)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (!ag) return json({ erro: 'agendamento_nao_encontrado' }, 404)

    if ((ag as Record<string, unknown>).status === 'cancelado') {
      return json({ erro: 'agendamento_cancelado' }, 422)
    }

    // 10. Idempotência: já existe ligação para este agendamento?
    const { data: ligacaoExistente } = await supaAdmin
      .from('ligacoes_ia' as never)
      .select('id, status')
      .eq('agendamento_id', body.agendamento_id)
      .neq('status', 'falhou')  // permite nova tentativa se a anterior falhou
      .maybeSingle()
      as unknown as { data: { id: string; status: string } | null }

    if (ligacaoExistente) {
      return json({
        erro:       'ligacao_ja_iniciada',
        ligacao_id: ligacaoExistente.id,
        status:     ligacaoExistente.status,
      }, 409)
    }

    // 11. Buscar nome do tenant (estabelecimento)
    const { data: tenantRow } = await supaAdmin
      .from('tenants')
      .select('nome')
      .eq('id', body.tenant_id)
      .maybeSingle()

    // Montar variáveis do script a partir dos relacionamentos retornados pelo Supabase
    const agTyped = ag as Record<string, unknown>
    const cliente      = agTyped.clientes      as { nome: string; telefone: string } | null
    const servico      = agTyped.servicos      as { nome: string } | null
    const profissional = agTyped.usuarios      as { nome: string } | null

    const telefoneCliente = cliente?.telefone?.replace(/\D/g, '')
    if (!telefoneCliente || telefoneCliente.length < 10) {
      return json({ erro: 'cliente_sem_telefone' }, 422)
    }

    const dataHora = new Date(agTyped.data_hora_inicio as string)
    const hora = dataHora.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })

    const script = renderScript({
      nome:            cliente?.nome ?? 'cliente',
      estabelecimento: (tenantRow as Record<string, unknown> | null)?.nome as string ?? 'nosso estabelecimento',
      servico:         servico?.nome ?? 'serviço',
      hora,
      profissional:    profissional?.nome ?? 'nosso profissional',
    })

    // ── 12. Gerar áudio com ElevenLabs ────────────────────────────────────────

    console.log(`[ligacao-ia] Gerando áudio ElevenLabs para agendamento ${body.agendamento_id}`)

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${credenciais.elevenlabs_voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   credenciais.elevenlabs_api_key,
          'Content-Type': 'application/json',
          'Accept':       'audio/mpeg',
        },
        body: JSON.stringify({
          text:     script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
        }),
      }
    )

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => '')
      console.error('[ligacao-ia] ElevenLabs erro:', elevenRes.status, errText)
      return json({
        erro:    elevenRes.status >= 500 ? 'elevenlabs_indisponivel' : 'elevenlabs_api_error',
        detalhe: errText.slice(0, 300),
        status:  elevenRes.status,
      }, 502)
    }

    const audioBuffer = await elevenRes.arrayBuffer()

    // ── 13. Upload do MP3 no Supabase Storage ─────────────────────────────────

    // ID temporário para nomear o arquivo antes de criar o registro no banco
    const tmpId = crypto.randomUUID()
    const arquivoPath = `${body.tenant_id}/${tmpId}.mp3`

    const { error: uploadErr } = await supaAdmin.storage
      .from('ligacoes-audio')
      .upload(arquivoPath, audioBuffer, { contentType: 'audio/mpeg', upsert: false })

    if (uploadErr) {
      console.error('[ligacao-ia] Storage upload erro:', uploadErr.message)
      return json({ erro: 'storage_upload_error', detalhe: uploadErr.message }, 500)
    }

    const { data: urlData } = supaAdmin.storage
      .from('ligacoes-audio')
      .getPublicUrl(arquivoPath)
    const audioUrl = urlData.publicUrl

    // ── 14. Criar registro em ligacoes_ia (necessário antes do Twilio para ter o ID) ─

    const { data: novaLigacao, error: insertErr } = await supaAdmin
      .from('ligacoes_ia' as never)
      .insert({
        tenant_id:      body.tenant_id,
        agendamento_id: body.agendamento_id,
        cliente_id:     ag.cliente_id,
        status:         'iniciando',
        audio_url:      audioUrl,
      })
      .select('id')
      .single()
      as unknown as { data: { id: string } | null; error: { message: string } | null }

    if (insertErr || !novaLigacao) {
      throw new Error(`ligacoes_ia insert: ${insertErr?.message}`)
    }

    const ligacaoId = novaLigacao.id

    // ── 15. Iniciar ligação via Twilio REST API ───────────────────────────────

    const webhookBase  = `${supabaseUrl}/functions/v1/twilio-webhook`
    const twimlUrl     = `${webhookBase}?ligacao_id=${ligacaoId}`
    const statusCbUrl  = `${webhookBase}?action=status&ligacao_id=${ligacaoId}`

    console.log(`[ligacao-ia] Iniciando ligação Twilio para ${telefoneCliente}`)

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credenciais.twilio_account_sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${credenciais.twilio_account_sid}:${credenciais.twilio_auth_token}`),
        },
        body: new URLSearchParams({
          To:                   telefoneCliente,
          From:                 credenciais.twilio_numero,
          Url:                  twimlUrl,
          StatusCallback:       statusCbUrl,
          StatusCallbackMethod: 'POST',
          StatusCallbackEvent:  'completed',
          // Tempo máximo de espera para atender (segundos)
          Timeout:              '30',
          // Duração máxima total da ligação (segundos)
          TimeLimit:            '120',
        }).toString(),
      }
    )

    if (!twilioRes.ok) {
      const errText = await twilioRes.text().catch(() => '')
      console.error('[ligacao-ia] Twilio erro:', twilioRes.status, errText)

      // Marcar ligação como falha antes de retornar
      await supaAdmin
        .from('ligacoes_ia' as never)
        .update({ status: 'falhou', erro: `Twilio ${twilioRes.status}: ${errText.slice(0, 200)}` })
        .eq('id', ligacaoId)

      return json({
        erro:    twilioRes.status >= 500 ? 'twilio_indisponivel' : 'twilio_api_error',
        detalhe: errText.slice(0, 300),
        status:  twilioRes.status,
      }, 502)
    }

    const twilioData = await twilioRes.json() as { sid?: string; status?: string }

    // 16. Atualizar ligação com SID do Twilio
    await supaAdmin
      .from('ligacoes_ia' as never)
      .update({
        twilio_call_sid: twilioData.sid ?? null,
        status:          'em_andamento',
      })
      .eq('id', ligacaoId)

    console.log(`[ligacao-ia] Ligação ${ligacaoId} iniciada — Twilio SID: ${twilioData.sid}`)

    return json({ ligacao_id: ligacaoId, twilio_call_sid: twilioData.sid })
  } catch (e) {
    console.error('[ligacao-ia] erro inesperado:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
