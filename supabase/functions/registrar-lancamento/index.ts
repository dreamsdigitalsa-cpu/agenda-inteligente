// Edge Function: registrar-lancamento
// Registra um lançamento financeiro (receita ou despesa) em uma sessão de caixa aberta.
//
// Regras de negócio:
// - Lançamentos são IMUTÁVEIS — apenas INSERT, nunca UPDATE ou DELETE
// - A sessão de caixa deve existir e estar com status 'aberto'
// - valor deve ser > 0 (reforçado aqui além do constraint de banco)
// - Se agendamento_id informado, atualiza o status do agendamento para 'concluido'
// - Retorna o saldo_atual da sessão após o lançamento
//
// Segurança:
// - Requer JWT válido; tenant validado contra o usuário autenticado
// - Requer role admin/recepcionista/super_admin OU permissão PERM-003 (acesso ao caixa)
// - Escrita feita exclusivamente via service_role (bypassa RLS)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id:        string
  caixa_sessao_id:  string
  tipo:             'receita' | 'despesa'
  categoria:        string
  descricao?:       string
  valor:            number
  forma_pagamento:  'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outro'
  agendamento_id?:  string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1) Validar autenticação via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ erro: 'nao_autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supaUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supaUser.auth.getUser(token)
    if (userErr || !userData?.user) return json({ erro: 'token_invalido' }, 401)
    const authUserId = userData.user.id

    // 2) Validar payload
    const body = (await req.json()) as Payload
    const formasPagamento = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outro']
    const tiposLancamento = ['receita', 'despesa']

    if (
      !body.tenant_id || !body.caixa_sessao_id || !body.tipo ||
      !body.categoria?.trim() || !body.forma_pagamento ||
      body.valor == null
    ) {
      return json({ erro: 'payload_invalido', campos_obrigatorios: ['tenant_id', 'caixa_sessao_id', 'tipo', 'categoria', 'valor', 'forma_pagamento'] }, 400)
    }
    if (!tiposLancamento.includes(body.tipo)) {
      return json({ erro: 'tipo_invalido', valores_aceitos: tiposLancamento }, 400)
    }
    if (!formasPagamento.includes(body.forma_pagamento)) {
      return json({ erro: 'forma_pagamento_invalida', valores_aceitos: formasPagamento }, 400)
    }
    if (typeof body.valor !== 'number' || body.valor <= 0) {
      return json({ erro: 'valor_invalido', detalhe: 'valor deve ser maior que zero' }, 400)
    }

    const supaAdmin = createClient(supabaseUrl, serviceKey)

    // 3) Verificar que o usuário pertence ao tenant
    const { data: usuarioDB } = await supaAdmin
      .from('usuarios')
      .select('id, tenant_id, perfil_id')
      .eq('auth_user_id', authUserId)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (!usuarioDB) {
      return json({ erro: 'acesso_negado', detalhe: 'usuário não pertence ao tenant informado' }, 403)
    }

    // 4) Verificar permissão de acesso ao caixa.
    //    Aceita: roles admin/recepcionista/super_admin OU permissão PERM-003 no perfil.
    //    Profissional e cliente não registram lançamentos diretamente.
    const [{ data: roleRow }, { data: permRow }] = await Promise.all([
      supaAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', authUserId)
        .in('role', ['admin', 'recepcionista', 'super_admin'])
        .maybeSingle(),
      usuarioDB.perfil_id
        ? supaAdmin
            .from('permissoes_do_perfil')
            .select('codigo_permissao')
            .eq('perfil_id', usuarioDB.perfil_id)
            .eq('codigo_permissao', 'PERM-003')
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (!roleRow && !permRow) {
      return json({ erro: 'permissao_insuficiente', detalhe: 'requer role admin/recepcionista ou permissão PERM-003' }, 403)
    }

    // 5) Verificar que a sessão de caixa existe, pertence ao tenant e está aberta
    const { data: sessao, error: errSessao } = await supaAdmin
      .from('caixa_sessoes')
      .select('id, tenant_id, unidade_id, status, saldo_inicial')
      .eq('id', body.caixa_sessao_id)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (errSessao || !sessao) {
      return json({ erro: 'sessao_nao_encontrada', caixa_sessao_id: body.caixa_sessao_id }, 404)
    }
    if (sessao.status !== 'aberto') {
      return json({ erro: 'sessao_fechada', status_atual: sessao.status }, 422)
    }

    // 6) Inserir o lançamento
    //    Lançamentos são imutáveis — APENAS INSERT, nunca UPDATE
    const criadoEm = new Date().toISOString()
    const { data: novoLancamento, error: errLancamento } = await supaAdmin
      .from('lancamentos')
      .insert({
        tenant_id:             body.tenant_id,
        unidade_id:            sessao.unidade_id,
        caixa_sessao_id:       body.caixa_sessao_id,
        tipo:                  body.tipo,
        categoria:             body.categoria.trim(),
        descricao:             body.descricao?.trim() ?? null,
        valor:                 body.valor,
        forma_pagamento:       body.forma_pagamento,
        agendamento_id:        body.agendamento_id ?? null,
        criado_por_usuario_id: usuarioDB.id,
        criado_em:             criadoEm,
      })
      .select('id')
      .single()

    if (errLancamento) throw new Error(`lancamentos insert: ${errLancamento.message}`)

    // 7) Se informado agendamento_id, marcar agendamento como 'concluido'
    if (body.agendamento_id) {
      const { error: errAgendamento } = await supaAdmin
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', body.agendamento_id)
        .eq('tenant_id', body.tenant_id)

      if (errAgendamento) {
        // Não falha o lançamento — apenas loga o problema
        console.warn('[registrar-lancamento] falha ao atualizar agendamento:', errAgendamento.message)
      }
    }

    // 8) Calcular saldo_atual da sessão após o lançamento
    //    saldo_atual = saldo_inicial + Σreceitas − Σdespesas
    const { data: totais } = await supaAdmin
      .from('lancamentos')
      .select('tipo, valor')
      .eq('caixa_sessao_id', body.caixa_sessao_id)

    const { totalReceitas, totalDespesas } = (totais ?? []).reduce(
      (acc, l) => {
        if (l.tipo === 'receita') acc.totalReceitas += Number(l.valor)
        else acc.totalDespesas += Number(l.valor)
        return acc
      },
      { totalReceitas: 0, totalDespesas: 0 },
    )
    const saldoAtual = Number(sessao.saldo_inicial) + totalReceitas - totalDespesas

    // 9) Registrar no audit_log
    await supaAdmin.from('audit_log').insert({
      tenant_id:   body.tenant_id,
      usuario_id:  usuarioDB.id,
      acao:        'REGISTRAR_LANCAMENTO',
      entidade:    'lancamentos',
      entidade_id: novoLancamento.id,
      dados_novos: {
        caixa_sessao_id: body.caixa_sessao_id,
        tipo:            body.tipo,
        categoria:       body.categoria,
        valor:           body.valor,
        forma_pagamento: body.forma_pagamento,
        agendamento_id:  body.agendamento_id ?? null,
        criado_em:       criadoEm,
      },
      ip: req.headers.get('x-forwarded-for') ?? null,
    })

    return json({ lancamento_id: novoLancamento.id, saldo_atual: saldoAtual })
  } catch (e) {
    console.error('[registrar-lancamento] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
