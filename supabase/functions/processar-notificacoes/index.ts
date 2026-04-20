// Edge Function: processar-notificacoes
// Executada a cada 15 minutos via Supabase Cron Job.
//
// Fluxo:
//   1. Lê configurações de todos os tenants com notificações ativas.
//   2. Para cada tenant, verifica agendamentos nas janelas de 24 h e 1 h
//      e cria registros em notificacoes_fila (idempotente via check de existência).
//   3. Processa os registros pendentes com agendado_para <= agora e tentativas < 3.
//   4. Atualiza status: 'enviado' ou incrementa tentativas / marca 'falhou'.
//
// Segurança:
//   - Aceita apenas requisições com cabeçalho x-cron-secret correto.
//   - Toda escrita é feita via service_role (bypassa RLS).
//
// Configuração do cron (Supabase Dashboard > Database > Cron Jobs):
//   Nome:     processar-notificacoes
//   Schedule: */15 * * * *
//   Comando SQL:
//     SELECT net.http_post(
//       url     := 'https://SEU_PROJETO.supabase.co/functions/v1/processar-notificacoes',
//       headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','SEU_SECRET'),
//       body    := '{}'::jsonb
//     );
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ConfigNotificacao {
  tenant_id:            string
  lembrete_24h_ativo:   boolean
  lembrete_1h_ativo:    boolean
  canal_whatsapp_ativo: boolean
  canal_email_ativo:    boolean
  canal_sms_ativo:      boolean
}

interface FilaItem {
  id:             string
  tipo:           string
  canal:          string
  tentativas:     number
  agendamento_id: string
  cliente_id:     string | null
  tenant_id:      string
}

// ── Templates de mensagem ─────────────────────────────────────────────────────

const TEMPLATES: Record<string, string> = {
  lembrete_24h:
    'Olá {nome}! Lembrete: você tem {servico} amanhã às {hora} com {profissional} na {estabelecimento}. Responda CONFIRMAR ou CANCELAR.',
  lembrete_1h:
    'Olá {nome}! Daqui a 1 hora você tem {servico} com {profissional}. Te esperamos! 😊',
  confirmacao:
    '✅ Agendamento confirmado! {servico} em {data} às {hora} com {profissional}.',
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Validar segredo do cron para evitar invocações não autorizadas
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ erro: 'nao_autorizado' }, 401)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supaAdmin   = createClient(supabaseUrl, serviceKey)

    // 1. Buscar configurações de todos os tenants com ao menos um canal ativo
    const { data: configs } = (await supaAdmin
      .from('configuracoes_notificacoes' as never)
      .select(
        'tenant_id, lembrete_24h_ativo, lembrete_1h_ativo, canal_whatsapp_ativo, canal_email_ativo, canal_sms_ativo',
      )
      .or('canal_whatsapp_ativo.eq.true,canal_email_ativo.eq.true,canal_sms_ativo.eq.true')) as unknown as { data: ConfigNotificacao[] | null }

    const agora    = new Date()
    let criadas    = 0
    let processadas = 0

    // 2. Para cada tenant, garantir que os registros da fila existam
    for (const cfg of configs ?? []) {
      // Canal de envio em ordem de prioridade: WhatsApp > SMS > E-mail
      const canal = cfg.canal_whatsapp_ativo ? 'whatsapp'
                  : cfg.canal_sms_ativo      ? 'sms'
                  : 'email'

      if (cfg.lembrete_24h_ativo) {
        criadas += await criarEntradas(supaAdmin, cfg.tenant_id, canal, 'lembrete_24h', agora, 24)
      }
      if (cfg.lembrete_1h_ativo) {
        criadas += await criarEntradas(supaAdmin, cfg.tenant_id, canal, 'lembrete_1h', agora, 1)
      }
    }

    // 3. Processar itens vencidos com tentativas restantes
    const { data: pendentes } = (await supaAdmin
      .from('notificacoes_fila' as never)
      .select('id, tipo, canal, tentativas, agendamento_id, cliente_id, tenant_id')
      .eq('status', 'pendente')
      .lt('tentativas', 3)
      .lte('agendado_para', agora.toISOString())
      .order('agendado_para', { ascending: true })
      .limit(100)) as unknown as { data: FilaItem[] | null }

    for (const item of pendentes ?? []) {
      await processarItem(supaAdmin, item)
      processadas++
    }

    console.log(`[processar-notificacoes] criadas=${criadas} processadas=${processadas}`)
    return json({ ok: true, criadas, processadas })
  } catch (e) {
    console.error('[processar-notificacoes] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

// ── Criar entradas na fila (idempotente) ──────────────────────────────────────

async function criarEntradas(
  db: SupabaseClient,
  tenantId: string,
  canal: string,
  tipo: 'lembrete_24h' | 'lembrete_1h',
  agora: Date,
  horasAntecedencia: number,
): Promise<number> {
  // Busca agendamentos cuja hora de início cai dentro da janela relevante.
  // Janela = [agora + (h-1)h, agora + (h+1)h] garante cobertura entre execuções de 15 min.
  const inicio = new Date(agora.getTime() + (horasAntecedencia - 1) * 3_600_000)
  const fim    = new Date(agora.getTime() + (horasAntecedencia + 1) * 3_600_000)

  const { data: agendamentos } = await db
    .from('agendamentos')
    .select('id, data_hora, cliente_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelado')
    .gte('data_hora', inicio.toISOString())
    .lte('data_hora', fim.toISOString())

  let criadas = 0

  for (const ag of (agendamentos ?? []) as Array<{ id: string; data_hora: string; cliente_id: string }>) {
    // Idempotência: não duplicar se já existe entrada para este agendamento + tipo
    const { data: existe } = await db
      .from('notificacoes_fila' as never)
      .select('id')
      .eq('agendamento_id', ag.id)
      .eq('tipo', tipo)
      .maybeSingle()

    if (existe) continue

    const agendadoPara = new Date(
      new Date(ag.data_hora).getTime() - horasAntecedencia * 3_600_000,
    )

    const { error } = await db
      .from('notificacoes_fila' as never)
      .insert({
        tenant_id:      tenantId,
        cliente_id:     ag.cliente_id,
        agendamento_id: ag.id,
        canal,
        tipo,
        status:         'pendente',
        tentativas:     0,
        agendado_para:  agendadoPara.toISOString(),
      })

    if (!error) criadas++
  }

  return criadas
}

// ── Processar um item da fila ─────────────────────────────────────────────────

async function processarItem(db: SupabaseClient, item: FilaItem): Promise<void> {
  try {
    // Buscar dados necessários para preencher o template
    const { data: ag } = await db
      .from('agendamentos')
      .select(`
        data_hora,
        clientes!cliente_id ( nome, telefone, email ),
        servicos!servico_id ( nome ),
        usuarios!profissional_id ( nome )
      `)
      .eq('id', item.agendamento_id)
      .maybeSingle()

    if (!ag) throw new Error('agendamento não encontrado')

    const { data: tenant } = await db
      .from('tenants')
      .select('nome')
      .eq('id', item.tenant_id)
      .maybeSingle()

    // Forçar tipagem dos relacionamentos retornados pelo Supabase
    const cliente       = (ag as Record<string, unknown>).clientes     as { nome: string; telefone: string; email: string } | null
    const servico       = (ag as Record<string, unknown>).servicos     as { nome: string } | null
    const profissional  = (ag as Record<string, unknown>).usuarios     as { nome: string } | null
    const nomeEstabelec = (tenant as Record<string, unknown> | null)?.nome as string ?? 'estabelecimento'

    const dataHora = new Date((ag as Record<string, unknown>).data_hora as string)
    const hora = dataHora.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
    const data = dataHora.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
    })

    const vars: Record<string, string> = {
      nome:            cliente?.nome        ?? 'Cliente',
      servico:         servico?.nome        ?? 'serviço',
      hora,
      data,
      profissional:    profissional?.nome   ?? 'profissional',
      estabelecimento: nomeEstabelec,
    }

    const template = TEMPLATES[item.tipo]
    if (!template) throw new Error(`template desconhecido: ${item.tipo}`)

    const mensagem = renderTemplate(template, vars)

    // Enviar pelo canal configurado
    let sucesso = false
    let erroMsg: string | null = null

    if (item.canal === 'whatsapp') {
      const telefone = cliente?.telefone ?? ''
      if (!telefone) throw new Error('cliente sem telefone cadastrado')

      const res = await chamarEnviarWhatsApp(item.tenant_id, telefone, mensagem, item.tipo)
      sucesso = res.sucesso
      erroMsg = res.erro ?? null
    } else {
      // SMS e e-mail: implementar quando as integrações estiverem configuradas
      erroMsg = `canal '${item.canal}' ainda não implementado`
    }

    const novoStatus = sucesso
      ? 'enviado'
      : item.tentativas + 1 >= 3
        ? 'falhou'
        : 'pendente'

    await db
      .from('notificacoes_fila' as never)
      .update({
        status:     novoStatus,
        tentativas: item.tentativas + 1,
        enviado_em: sucesso ? new Date().toISOString() : null,
        erro:       erroMsg,
      })
      .eq('id', item.id)
  } catch (e) {
    const novoStatus = item.tentativas + 1 >= 3 ? 'falhou' : 'pendente'
    await db
      .from('notificacoes_fila' as never)
      .update({
        tentativas: item.tentativas + 1,
        status:     novoStatus,
        erro:       String(e),
      })
      .eq('id', item.id)
  }
}

// ── Chamar a Edge Function enviar-whatsapp ────────────────────────────────────

async function chamarEnviarWhatsApp(
  tenantId: string,
  telefone: string,
  mensagem: string,
  tipo: string,
): Promise<{ sucesso: boolean; erro?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/enviar-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ tenant_id: tenantId, telefone, mensagem, tipo }),
    })

    const data = await res.json() as { sucesso?: boolean; erro?: string }

    if (!res.ok || !data.sucesso) {
      return { sucesso: false, erro: data.erro ?? `HTTP ${res.status}` }
    }
    return { sucesso: true }
  } catch (e) {
    return { sucesso: false, erro: String(e) }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
