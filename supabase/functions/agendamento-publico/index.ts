// Edge Function PÚBLICA: agendamento online por slug do tenant.
// Não exige JWT (verify_jwt=false em config.toml).
// Usa SERVICE_ROLE para contornar RLS de forma segura, validando o slug.
//
// Ações (?acao=):
//  - tenant      → dados do tenant + config (logo, horário, cor) por slug
//  - servicos    → lista de serviços ativos do tenant
//  - profissionais → lista de profissionais ativos
//  - slots       → slots livres para profissional+data+duracao
//  - criar       → POST: cria cliente (tem_conta=false) + agendamento
//
// Rate limiting (ação 'criar'):
//  - Máximo RATE_LIMIT_CRIAR tentativas por hora por IP por slug.
//  - Persiste contagem na tabela rate_limit_requests (upsert por janela horária).
//  - Registros mais antigos que 24h são elegíveis para limpeza (ver migration).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LIMITE_FREEMIUM_MES = 50 // agendamentos/mês no plano grátis
const RATE_LIMIT_CRIAR = 30    // máximo de tentativas de agendamento por hora por IP por slug

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const url = new URL(req.url)
  const acao = url.searchParams.get('acao') ?? ''
  const slug = url.searchParams.get('slug') ?? ''

  if (!slug) return json({ erro: 'slug_obrigatorio' }, 400)

  // Resolve tenant pelo slug (todas as ações precisam)
  const { data: tenant } = await sb
    .from('tenants')
    .select('id, nome, plano, status, segmento')
    .eq('slug', slug)
    .maybeSingle()
  if (!tenant) return json({ erro: 'estabelecimento_nao_encontrado' }, 404)
  if (tenant.status !== 'ativo') return json({ erro: 'estabelecimento_inativo' }, 403)

  try {
    if (req.method === 'GET' && acao === 'tenant') {
      const { data: cfg } = await sb
        .from('configuracoes_tenant')
        .select('logo_url, cor_principal, horario_funcionamento, endereco')
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      return json({ tenant, configuracao: cfg })
    }

    if (req.method === 'GET' && acao === 'servicos') {
      const { data } = await sb
        .from('servicos')
        .select('id, nome, duracao_minutos, preco_centavos')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome')
      return json({ servicos: data ?? [] })
    }

    if (req.method === 'GET' && acao === 'profissionais') {
      const { data } = await sb
        .from('profissionais')
        .select('id, nome, especialidade')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome')
      return json({ profissionais: data ?? [] })
    }

    if (req.method === 'GET' && acao === 'slots') {
      // ?data=YYYY-MM-DD&duracao=30&profissional_id=opt
      const dataStr = url.searchParams.get('data')!
      const duracao = parseInt(url.searchParams.get('duracao') ?? '30', 10)
      const profissionalId = url.searchParams.get('profissional_id')
      if (!dataStr) return json({ erro: 'data_obrigatoria' }, 400)

      const inicioDia = new Date(`${dataStr}T00:00:00`)
      const fimDia = new Date(inicioDia)
      fimDia.setDate(fimDia.getDate() + 1)

      let q = sb
        .from('agendamentos')
        .select('profissional_id, data_hora_inicio, data_hora_fim')
        .eq('tenant_id', tenant.id)
        .neq('status', 'cancelado')
        .gte('data_hora_inicio', inicioDia.toISOString())
        .lt('data_hora_inicio', fimDia.toISOString())
      if (profissionalId) q = q.eq('profissional_id', profissionalId)
      const { data: ocupados } = await q

      // Geração de slots de 30min entre 8h e 20h
      const slots: { hora: string; livre: boolean }[] = []
      for (let h = 8; h < 20; h++) {
        for (let m = 0; m < 60; m += 30) {
          const inicio = new Date(inicioDia)
          inicio.setHours(h, m, 0, 0)
          const fim = new Date(inicio.getTime() + duracao * 60_000)
          // Considera ocupado se houver sobreposição com algum agendamento
          const conflito = (ocupados ?? []).some((a) => {
            const ai = new Date(a.data_hora_inicio).getTime()
            const af = new Date(a.data_hora_fim).getTime()
            return inicio.getTime() < af && fim.getTime() > ai
          })
          slots.push({
            hora: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            livre: !conflito,
          })
        }
      }
      return json({ slots })
    }

    if (req.method === 'POST' && acao === 'criar') {
      // ── Rate limiting por IP ────────────────────────────────────────────
      // Extrai o IP real (pode ser IPv4 ou IPv6 via x-forwarded-for).
      const ipRaw = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'unknown'
      const ip = ipRaw.split(',')[0].trim()

      // Janela horária: trunca ao início da hora atual (ex: 14:00:00 UTC)
      const agora = new Date()
      const janelaHora = new Date(
        Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), agora.getUTCHours())
      ).toISOString()

      // Upsert: incrementa o contador para este IP+slug+hora
      const { data: rateRow, error: rateErr } = await sb
        .from('rate_limit_requests')
        .upsert(
          { ip, slug, janela_hora: janelaHora, contagem: 1 },
          { onConflict: 'ip,slug,janela_hora', ignoreDuplicates: false }
        )
        .select('contagem')
        .maybeSingle()

      // Se o upsert não retornou (linha já existe), busca o valor atual e incrementa
      let contagemAtual = rateRow?.contagem ?? 0
      if (rateErr || !rateRow) {
        // Fallback: incrementa diretamente via SQL
        const { data: incrementRow } = await sb.rpc('incrementar_rate_limit' as never, {
          p_ip: ip, p_slug: slug, p_janela: janelaHora,
        } as never) as unknown as { data: { contagem: number } | null }
        contagemAtual = incrementRow?.contagem ?? contagemAtual
      }

      if (contagemAtual > RATE_LIMIT_CRIAR) {
        return json({
          erro: 'rate_limit_excedido',
          detalhe: `Máximo de ${RATE_LIMIT_CRIAR} agendamentos por hora neste dispositivo.`,
          retry_after_seconds: 3600 - (agora.getUTCMinutes() * 60 + agora.getUTCSeconds()),
        }, 429)
      }

      const body = await req.json()
      const {
        nome,
        telefone,
        email,
        servico_id,
        profissional_id,
        data,
        hora,
        aceita_lembretes,
      } = body as Record<string, string | boolean | null>

      // Validação básica de input
      if (!nome || !telefone || !servico_id || !data || !hora) {
        return json({ erro: 'campos_obrigatorios_faltando' }, 400)
      }
      const nomeStr = String(nome).trim().slice(0, 100)
      const telStr = String(telefone).trim().slice(0, 30)
      const emailStr = email ? String(email).trim().slice(0, 255) : null
      if (nomeStr.length < 2) return json({ erro: 'nome_invalido' }, 400)

      // Limite freemium (mês corrente)
      if (tenant.plano === 'freemium') {
        const inicioMes = new Date()
        inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
        const { count } = await sb
          .from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('criado_em', inicioMes.toISOString())
        if ((count ?? 0) >= LIMITE_FREEMIUM_MES) {
          return json({ erro: 'limite_freemium_atingido' }, 402)
        }
      }

      // Carrega serviço (duração)
      const { data: serv } = await sb
        .from('servicos')
        .select('id, duracao_minutos')
        .eq('id', String(servico_id))
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      if (!serv) return json({ erro: 'servico_invalido' }, 400)

      // Resolve profissional (se "sem preferência", pega o primeiro ativo)
      let profId = profissional_id ? String(profissional_id) : null
      if (!profId) {
        const { data: p } = await sb
          .from('profissionais')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle()
        if (!p) return json({ erro: 'sem_profissional_disponivel' }, 400)
        profId = p.id
      }

      const inicio = new Date(`${data}T${hora}:00`)
      const fim = new Date(inicio.getTime() + serv.duracao_minutos * 60_000)

      // Conflito final (race condition)
      const { data: conflitos } = await sb
        .from('agendamentos')
        .select('id')
        .eq('profissional_id', profId)
        .neq('status', 'cancelado')
        .lt('data_hora_inicio', fim.toISOString())
        .gt('data_hora_fim', inicio.toISOString())
      if ((conflitos ?? []).length > 0) {
        return json({ erro: 'horario_ocupado' }, 409)
      }

      // Cria/encontra cliente sem conta
      const { data: clienteExistente } = await sb
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('telefone', telStr)
        .maybeSingle()
      let clienteId = clienteExistente?.id
      if (!clienteId) {
        const { data: novo, error } = await sb
          .from('clientes')
          .insert({
            tenant_id: tenant.id,
            nome: nomeStr,
            telefone: telStr,
            email: emailStr,
            tem_conta: false,
            observacoes: aceita_lembretes ? 'Aceita lembretes via WhatsApp' : null,
          })
          .select('id')
          .single()
        if (error) throw error
        clienteId = novo.id
      }

      // Confirmação automática (config futura) — por ora: sempre confirmacao manual = false
      const confirmacaoManual = false

      const { data: ag, error: errAg } = await sb
        .from('agendamentos')
        .insert({
          tenant_id: tenant.id,
          cliente_id: clienteId,
          profissional_id: profId,
          servico_id: String(servico_id),
          data_hora_inicio: inicio.toISOString(),
          data_hora_fim: fim.toISOString(),
          status: confirmacaoManual ? 'agendado' : 'confirmado',
          origem: 'online',
          confirmacao_manual_necessaria: confirmacaoManual,
        })
        .select('id, status')
        .single()
      if (errAg) throw errAg

      // TODO: enfileirar notificação (notificacoes_fila ainda não existe)

      return json({ ok: true, agendamento: ag, confirmacaoManual })
    }

    if (req.method === 'POST' && acao === 'entrar-na-fila') {
      const body = await req.json()
      const {
        nome,
        telefone,
        servico_id,
        profissional_id,
      } = body as Record<string, string | null>

      if (!nome || !telefone) {
        return json({ erro: 'campos_obrigatorios_faltando' }, 400)
      }

      // Busca uma unidade ativa para o tenant
      const { data: unidade } = await sb
        .from('unidades')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()
      
      if (!unidade) return json({ erro: 'unidade_nao_encontrada' }, 400)

      // Calcula a próxima posição
      const { data: ultimaPosicao } = await sb
        .from('fila_espera')
        .select('posicao')
        .eq('tenant_id', tenant.id)
        .eq('unidade_id', unidade.id)
        .in('status', ['aguardando', 'chamado'])
        .order('posicao', { ascending: false })
        .limit(1)
        .maybeSingle()

      const novaPosicao = (ultimaPosicao?.posicao ?? 0) + 1

      // Cria entrada na fila
      const { data: fila, error: errFila } = await sb
        .from('fila_espera')
        .insert({
          tenant_id: tenant.id,
          unidade_id: unidade.id,
          profissional_id: profissional_id || null,
          cliente_nome: nome,
          cliente_telefone: telefone,
          servico_id: servico_id || null,
          posicao: novaPosicao,
          status: 'aguardando'
        })
        .select()
        .single()

      if (errFila) throw errFila

      return json({ ok: true, itemFila: fila, posicao: novaPosicao })
    }

    return json({ erro: 'acao_invalida' }, 400)

  } catch (e) {
    console.error('agendamento-publico erro', e)
    return json({ erro: 'erro_interno', detalhe: e instanceof Error ? e.message : String(e) }, 500)
  }
})
