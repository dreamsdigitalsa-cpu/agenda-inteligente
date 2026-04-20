// Edge Function: twilio-webhook
// Recebe callbacks do Twilio para a ligação de confirmação de agendamento.
//
// Rotas (via query param ?action=):
//   (vazio)       → Endpoint TwiML inicial: retorna XML com <Play> + <Gather> para DTMF.
//   action=dtmf   → Processa dígito pressionado pelo cliente:
//                     1 = confirmar agendamento
//                     2 = cancelar agendamento + registrar em notificacoes_fila
//                     3 = transferir para telefone do estabelecimento
//   action=status → Status callback final do Twilio: atualiza duração e status.
//
// Segurança:
//   - Valida assinatura HMAC-SHA1 do Twilio em TODAS as rotas (exceto quando
//     TWILIO_SKIP_SIGNATURE_VALIDATION=true em ambiente de desenvolvimento).
//   - Usa service_role para todas as gravações no banco (bypassa RLS).
//
// Formato de resposta:
//   - TwiML (text/xml) para rotas de chamada ativa.
//   - JSON para a rota de status (apenas para logging; Twilio ignora o body).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// ── Tipos internos ────────────────────────────────────────────────────────────

interface LigacaoIA {
  id:                       string
  tenant_id:                string
  agendamento_id:           string | null
  audio_url:                string | null
  status:                   string
  resultado:                string | null
}

interface CredenciaisGlobais {
  twilio_account_sid:  string
  twilio_auth_token:   string
  twilio_numero:       string
}

// ── Validação de assinatura Twilio ────────────────────────────────────────────
// Algoritmo: HMAC-SHA1(auth_token, URL_completa_com_query_string + params_POST_ordenados)
// Ref: https://www.twilio.com/docs/usage/webhooks/webhooks-security

async function validarAssinaturaTwilio(
  authToken:    string,
  signature:    string,
  urlCompleta:  string,
  postParams:   Record<string, string>,
): Promise<boolean> {
  // Concatenar URL + parâmetros POST ordenados alfabeticamente
  let dataToSign = urlCompleta
  const sortedKeys = Object.keys(postParams).sort()
  for (const key of sortedKeys) {
    dataToSign += key + (postParams[key] ?? '')
  }

  const keyBytes = new TextEncoder().encode(authToken)
  const msgBytes = new TextEncoder().encode(dataToSign)

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: { name: 'SHA-1' } }, false, ['sign'],
  )
  const sigBytes     = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes)
  const computedSig  = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))

  return computedSig === signature
}

// ── TwiML helpers ─────────────────────────────────────────────────────────────

function twimlXml(content: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`,
    { headers: { 'Content-Type': 'text/xml; charset=utf-8' } },
  )
}

function twimlConectar(audioUrl: string, dtmfUrl: string): Response {
  // Reproduce o áudio gerado pelo ElevenLabs e aguarda 1 dígito DTMF.
  // Timeout de 10 s; se não houver entrada, cai no <Say> de fallback.
  return twimlXml(
    `<Gather numDigits="1" action="${dtmfUrl}" method="POST" timeout="10">` +
      `<Play>${audioUrl}</Play>` +
    `</Gather>` +
    `<Say language="pt-BR">Não recebemos sua resposta. Obrigado pelo contato!</Say>`,
  )
}

function twimlConfirmar(): Response {
  return twimlXml(
    `<Say language="pt-BR">Perfeito! Seu agendamento foi confirmado. Até logo!</Say>` +
    `<Hangup/>`,
  )
}

function twimlCancelar(): Response {
  return twimlXml(
    `<Say language="pt-BR">Seu agendamento foi cancelado. ` +
    `Se desejar reagendar, entre em contato conosco. Até logo!</Say>` +
    `<Hangup/>`,
  )
}

function twimlTransferir(numero: string): Response {
  return twimlXml(
    `<Say language="pt-BR">Aguarde, estou transferindo você para nossa equipe.</Say>` +
    `<Dial timeout="30">${numero}</Dial>`,
  )
}

function twimlSemEntrada(): Response {
  return twimlXml(
    `<Say language="pt-BR">Não identificamos sua resposta. Obrigado pelo contato!</Say>` +
    `<Hangup/>`,
  )
}

function twimlErro(): Response {
  return twimlXml(
    `<Say language="pt-BR">Ocorreu um erro ao processar sua resposta. Tente novamente mais tarde.</Say>` +
    `<Hangup/>`,
  )
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Twilio não envia preflight CORS, mas respondemos 200 por precaução
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 })

  try {
    const urlObj    = new URL(req.url)
    const action    = urlObj.searchParams.get('action') ?? ''
    const ligacaoId = urlObj.searchParams.get('ligacao_id') ?? ''

    if (!ligacaoId) return json({ erro: 'ligacao_id_ausente' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supaAdmin   = createClient(supabaseUrl, serviceKey)

    // Ler corpo como texto para validação de assinatura e parse posterior
    const bodyText = await req.text()
    const postParams = Object.fromEntries(new URLSearchParams(bodyText).entries())

    // ── Carregar credenciais Twilio para validar assinatura ───────────────────

    const { data: credsRow } = await supaAdmin
      .from('configuracoes_sistema' as never)
      .select('valor')
      .eq('chave', 'ligacao_ia_credenciais')
      .maybeSingle()
      as unknown as { data: { valor: CredenciaisGlobais } | null }

    const credenciais = credsRow?.valor

    // Pular validação de assinatura apenas em desenvolvimento explícito
    const skipValidacao = Deno.env.get('TWILIO_SKIP_SIGNATURE_VALIDATION') === 'true'

    if (!skipValidacao) {
      if (!credenciais?.twilio_auth_token) {
        console.error('[twilio-webhook] credenciais não configuradas')
        return twimlErro()
      }

      const twilioSig = req.headers.get('X-Twilio-Signature') ?? ''
      const urlCompleta = req.url

      const sigValida = await validarAssinaturaTwilio(
        credenciais.twilio_auth_token,
        twilioSig,
        urlCompleta,
        postParams,
      )

      if (!sigValida) {
        console.warn('[twilio-webhook] assinatura inválida — possível request não autorizado')
        return json({ erro: 'assinatura_invalida' }, 403)
      }
    }

    // ── Buscar registro da ligação ────────────────────────────────────────────

    const { data: ligacao } = await supaAdmin
      .from('ligacoes_ia' as never)
      .select('id, tenant_id, agendamento_id, audio_url, status, resultado')
      .eq('id', ligacaoId)
      .maybeSingle()
      as unknown as { data: LigacaoIA | null }

    if (!ligacao) {
      console.error(`[twilio-webhook] ligacao_id não encontrado: ${ligacaoId}`)
      return twimlErro()
    }

    // ── Roteamento por action ─────────────────────────────────────────────────

    // ── (1) TwiML inicial: reproduz áudio + captura DTMF ─────────────────────

    if (action === '' || action === 'twiml') {
      if (!ligacao.audio_url) {
        console.error(`[twilio-webhook] audio_url vazio para ligacao ${ligacaoId}`)
        return twimlErro()
      }

      const dtmfUrl = `${supabaseUrl}/functions/v1/twilio-webhook?action=dtmf&ligacao_id=${ligacaoId}`

      // Atualizar status para em_andamento (a ligação foi atendida)
      await supaAdmin
        .from('ligacoes_ia' as never)
        .update({ status: 'em_andamento' })
        .eq('id', ligacaoId)

      return twimlConectar(ligacao.audio_url, dtmfUrl)
    }

    // ── (2) DTMF: processa dígito pressionado ────────────────────────────────

    if (action === 'dtmf') {
      const digito = postParams['Digits'] ?? ''

      // Se já foi processado (re-entrega do Twilio), retornar resposta idempotente
      if (ligacao.resultado) {
        console.log(`[twilio-webhook] DTMF já processado para ligacao ${ligacaoId}`)
        return digito === '3' ? twimlSemEntrada() : twimlSemEntrada()
      }

      if (!ligacao.agendamento_id) {
        console.error(`[twilio-webhook] agendamento_id ausente na ligacao ${ligacaoId}`)
        return twimlErro()
      }

      // ── DTMF 1: Confirmar ─────────────────────────────────────────────────
      if (digito === '1') {
        await Promise.all([
          supaAdmin
            .from('agendamentos')
            .update({ status: 'confirmado' })
            .eq('id', ligacao.agendamento_id),
          supaAdmin
            .from('ligacoes_ia' as never)
            .update({ status: 'concluida', resultado: 'confirmado', dtmf: '1' })
            .eq('id', ligacaoId),
          // Registrar confirmação na fila de notificações para histórico
          supaAdmin
            .from('notificacoes_fila' as never)
            .insert({
              tenant_id:      ligacao.tenant_id,
              agendamento_id: ligacao.agendamento_id,
              canal:          'whatsapp',
              tipo:           'confirmacao',
              status:         'cancelado',  // não reenviar; já confirmado por ligação
              tentativas:     0,
              agendado_para:  new Date().toISOString(),
            }),
        ])

        console.log(`[twilio-webhook] Agendamento ${ligacao.agendamento_id} CONFIRMADO via ligação IA`)
        return twimlConfirmar()
      }

      // ── DTMF 2: Cancelar ──────────────────────────────────────────────────
      if (digito === '2') {
        await Promise.all([
          supaAdmin
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .eq('id', ligacao.agendamento_id),
          supaAdmin
            .from('ligacoes_ia' as never)
            .update({ status: 'concluida', resultado: 'cancelado', dtmf: '2' })
            .eq('id', ligacaoId),
        ])

        console.log(`[twilio-webhook] Agendamento ${ligacao.agendamento_id} CANCELADO via ligação IA`)
        return twimlCancelar()
      }

      // ── DTMF 3: Transferir ────────────────────────────────────────────────
      if (digito === '3') {
        // Buscar telefone do estabelecimento nas configs do tenant
        const { data: cfgTenant } = await supaAdmin
          .from('configuracoes_ligacao_ia' as never)
          .select('telefone_estabelecimento')
          .eq('tenant_id', ligacao.tenant_id)
          .maybeSingle()
          as unknown as { data: { telefone_estabelecimento: string | null } | null }

        const telefoneEstab = cfgTenant?.telefone_estabelecimento?.replace(/\D/g, '')

        await supaAdmin
          .from('ligacoes_ia' as never)
          .update({ status: 'concluida', resultado: 'transferido', dtmf: '3' })
          .eq('id', ligacaoId)

        if (!telefoneEstab || telefoneEstab.length < 10) {
          // Telefone não configurado: informar e encerrar
          console.warn(`[twilio-webhook] Tenant ${ligacao.tenant_id} sem telefone para transferência`)
          return twimlXml(
            `<Say language="pt-BR">No momento não é possível transferir sua ligação. ` +
            `Por favor, ligue diretamente para o estabelecimento. Até logo!</Say>` +
            `<Hangup/>`,
          )
        }

        console.log(`[twilio-webhook] Transferindo para ${telefoneEstab}`)
        return twimlTransferir(telefoneEstab)
      }

      // Dígito inválido ou nenhum
      await supaAdmin
        .from('ligacoes_ia' as never)
        .update({ status: 'concluida', resultado: 'sem_resposta', dtmf: digito || null })
        .eq('id', ligacaoId)

      return twimlSemEntrada()
    }

    // ── (3) Status callback: atualiza duração e status final ─────────────────

    if (action === 'status') {
      const callStatus  = postParams['CallStatus']  ?? ''
      const duracaoStr  = postParams['CallDuration'] ?? ''
      const duracao     = duracaoStr ? parseInt(duracaoStr, 10) : null

      // Mapear status do Twilio para o status interno
      const statusMap: Record<string, string> = {
        completed:  'concluida',
        'no-answer': 'sem_resposta',
        busy:        'sem_resposta',
        failed:      'falhou',
        canceled:    'falhou',
      }
      const statusFinal = statusMap[callStatus] ?? 'falhou'

      // Não sobrescrever se já foi marcado com resultado via DTMF
      const updateData: Record<string, unknown> = { duracao_segundos: duracao }
      if (!ligacao.resultado) {
        updateData.status    = statusFinal
        updateData.resultado = callStatus === 'no-answer' || callStatus === 'busy'
          ? 'sem_resposta'
          : null
        updateData.erro = callStatus === 'failed' || callStatus === 'canceled'
          ? `Twilio CallStatus: ${callStatus}`
          : null
      }

      await supaAdmin
        .from('ligacoes_ia' as never)
        .update(updateData)
        .eq('id', ligacaoId)

      console.log(`[twilio-webhook] Status final da ligacao ${ligacaoId}: ${callStatus} (${duracao}s)`)
      return json({ ok: true })
    }

    return json({ erro: 'action_desconhecida', action }, 400)
  } catch (e) {
    console.error('[twilio-webhook] erro inesperado:', e)
    // Retornar TwiML de erro para não deixar o Twilio aguardando
    return twimlErro()
  }
})
