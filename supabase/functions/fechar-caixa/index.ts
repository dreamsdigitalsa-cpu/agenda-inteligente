// Edge Function: fechar-caixa
// Fecha uma sessão de caixa, calcula o saldo esperado e apura diferença.
//
// Regras de negócio:
// - A sessão deve existir e estar 'aberto'
// - saldo_esperado = saldo_inicial + Σreceitas − Σdespesas
// - diferenca = saldo_final_contado − saldo_esperado (pode ser negativa = falta)
// - Retorna relatório completo do dia com todos os lançamentos
//
// Segurança:
// - Requer JWT válido; tenant validado contra o usuário autenticado
// - UPDATE feito exclusivamente via service_role (bypassa RLS)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id:            string
  caixa_sessao_id:      string
  saldo_final_contado:  number
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
    if (!body.tenant_id || !body.caixa_sessao_id || body.saldo_final_contado == null) {
      return json({ erro: 'payload_invalido', campos_obrigatorios: ['tenant_id', 'caixa_sessao_id', 'saldo_final_contado'] }, 400)
    }
    if (typeof body.saldo_final_contado !== 'number' || body.saldo_final_contado < 0) {
      return json({ erro: 'saldo_final_invalido', detalhe: 'saldo_final_contado não pode ser negativo' }, 400)
    }

    const supaAdmin = createClient(supabaseUrl, serviceKey)

    // 3) Verificar que o usuário pertence ao tenant
    const { data: usuarioDB } = await supaAdmin
      .from('usuarios')
      .select('id, tenant_id')
      .eq('auth_user_id', authUserId)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (!usuarioDB) {
      return json({ erro: 'acesso_negado', detalhe: 'usuário não pertence ao tenant informado' }, 403)
    }

    // 4) Buscar sessão de caixa — deve existir e estar aberta
    const { data: sessao, error: errSessao } = await supaAdmin
      .from('caixa_sessoes')
      .select('id, tenant_id, saldo_inicial, status, abertura_em')
      .eq('id', body.caixa_sessao_id)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (errSessao || !sessao) {
      return json({ erro: 'sessao_nao_encontrada', caixa_sessao_id: body.caixa_sessao_id }, 404)
    }
    if (sessao.status !== 'aberto') {
      return json({ erro: 'sessao_ja_fechada', status_atual: sessao.status }, 422)
    }

    // 5) Buscar todos os lançamentos da sessão para o relatório e cálculo
    const { data: lancamentos, error: errLancamentos } = await supaAdmin
      .from('lancamentos')
      .select('id, tipo, categoria, descricao, valor, forma_pagamento, agendamento_id, criado_em')
      .eq('caixa_sessao_id', body.caixa_sessao_id)
      .order('criado_em', { ascending: true })

    if (errLancamentos) throw new Error(`lancamentos select: ${errLancamentos.message}`)

    // 6) Calcular totais
    const { totalReceitas, totalDespesas } = (lancamentos ?? []).reduce(
      (acc, l) => {
        if (l.tipo === 'receita') acc.totalReceitas += Number(l.valor)
        else acc.totalDespesas += Number(l.valor)
        return acc
      },
      { totalReceitas: 0, totalDespesas: 0 },
    )

    const saldoInicial   = Number(sessao.saldo_inicial)
    const saldoEsperado  = saldoInicial + totalReceitas - totalDespesas
    const diferenca      = body.saldo_final_contado - saldoEsperado
    const fechamentoEm   = new Date().toISOString()

    // 7) Atualizar sessão para 'fechado'
    const { error: errFecha } = await supaAdmin
      .from('caixa_sessoes')
      .update({
        fechamento_em: fechamentoEm,
        saldo_final:   body.saldo_final_contado,
        diferenca,
        status:        'fechado',
      })
      .eq('id', body.caixa_sessao_id)

    if (errFecha) throw new Error(`caixa_sessoes update: ${errFecha.message}`)

    // 8) Registrar no audit_log
    await supaAdmin.from('audit_log').insert({
      tenant_id:   body.tenant_id,
      usuario_id:  usuarioDB.id,
      acao:        'FECHAR_CAIXA',
      entidade:    'caixa_sessoes',
      entidade_id: body.caixa_sessao_id,
      dados_anteriores: {
        status:       'aberto',
        abertura_em:  sessao.abertura_em,
        saldo_inicial: saldoInicial,
      },
      dados_novos: {
        status:              'fechado',
        fechamento_em:       fechamentoEm,
        saldo_final_contado: body.saldo_final_contado,
        saldo_esperado:      saldoEsperado,
        diferenca,
        total_receitas:      totalReceitas,
        total_despesas:      totalDespesas,
      },
      ip: req.headers.get('x-forwarded-for') ?? null,
    })

    // 9) Retornar relatório completo do dia
    return json({
      caixa_sessao_id: body.caixa_sessao_id,
      abertura_em:     sessao.abertura_em,
      fechamento_em:   fechamentoEm,
      saldo_inicial:   saldoInicial,
      total_receitas:  totalReceitas,
      total_despesas:  totalDespesas,
      saldo_esperado:  saldoEsperado,
      saldo_final:     body.saldo_final_contado,
      diferenca,       // positivo = sobra, negativo = falta
      lancamentos:     lancamentos ?? [],
    })
  } catch (e) {
    console.error('[fechar-caixa] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
