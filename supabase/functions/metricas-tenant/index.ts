import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Pegar o tenant_id do usuário (baseado no RLS/JWT)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado')

    // Buscar tenant_id ativo do usuário
    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('id, tenant_id, unidade_id')
      .eq('id', user.id)
      .single()

    if (perfilError || !perfil) throw new Error('Tenant não encontrado')

    const tenantId = perfil.tenant_id
    const unidadeId = perfil.unidade_id
    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999).toISOString()

    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString()
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999).toISOString()

    // ─── 1. KPIs FINANCEIROS (MÊS ATUAL) ───────────────────────────────────
    
    // Receitas e Despesas do mês atual
    const { data: lancamentosMes } = await supabase
      .from('lancamentos')
      .select('tipo, valor, categoria, criado_em')
      .eq('tenant_id', tenantId)
      .gte('criado_em', primeiroDiaMes)

    const receitaMes = lancamentosMes
      ?.filter(l => l.tipo === 'receita')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0
    
    const despesaMes = lancamentosMes
      ?.filter(l => l.tipo === 'despesa')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0

    const lucroMes = receitaMes - despesaMes

    // Ticket Médio do mês
    const { count: agendamentosConcluidosMes } = await supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'concluido')
      .gte('data_hora_inicio', primeiroDiaMes)

    const ticketMedioMes = agendamentosConcluidosMes && agendamentosConcluidosMes > 0 
      ? receitaMes / agendamentosConcluidosMes 
      : 0

    // ─── 2. VARIAÇÃO VS MÊS ANTERIOR ───────────────────────────────────────
    
    const { data: lancamentosMesAnterior } = await supabase
      .from('lancamentos')
      .select('tipo, valor')
      .eq('tenant_id', tenantId)
      .gte('criado_em', primeiroDiaMesAnterior)
      .lte('criado_em', ultimoDiaMesAnterior)

    const receitaMesAnterior = lancamentosMesAnterior
      ?.filter(l => l.tipo === 'receita')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0

    const variacaoReceita = receitaMesAnterior > 0 
      ? ((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100 
      : 0

    // ─── 3. DADOS PARA GRÁFICOS E LISTAS ───────────────────────────────────

    // Receita por dia (últimos 30 dias)
    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
    
    const { data: lancamentos30Dias } = await supabase
      .from('lancamentos')
      .select('tipo, valor, criado_em')
      .eq('tenant_id', tenantId)
      .eq('tipo', 'receita')
      .gte('criado_em', trintaDiasAtras.toISOString())

    const graficoReceita = Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      const dataStr = d.toISOString().split('T')[0]
      const total = lancamentos30Dias
        ?.filter(l => l.criado_em.startsWith(dataStr))
        .reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0
      return { data: dataStr, total }
    })

    // Despesas por categoria (Top 5)
    const despesasPorCat = lancamentosMes
      ?.filter(l => l.tipo === 'despesa')
      .reduce((acc: any, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor
        return acc
      }, {})

    const topDespesas = Object.entries(despesasPorCat || {})
      .map(([categoria, valor]) => ({ categoria, valor: valor as number }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)

    // Próximas contas a vencer (Placeholder - assumindo que existe ou virá de lancamentos futuros/contas_pagar)
    // Se não houver tabela contas_pagar, simulamos com lancamentos agendados se existirem
    const proximasContas = [] 

    // ─── 4. ALERTAS ────────────────────────────────────────────────────────

    // Caixa aberto hoje?
    const { data: caixaHoje } = await supabase
      .from('caixa_sessoes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('unidade_id', unidadeId)
      .gte('abertura_em', inicioHoje)
      .lte('abertura_em', fimHoje)
      .maybeSingle()

    // Comissões pendentes (Mês atual)
    // Placeholder - lógica depende da implementação do módulo de comissões
    const comissoesPendentes = 0

    // Lançamentos sem categoria (se categoria for nula ou 'outros'/'pendente')
    const { count: lancamentosSemCategoria } = await supabase
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .or('categoria.eq.outros,categoria.is.null')

    // ─── 5. DADOS ORIGINAIS (KPIs DO DIA) ──────────────────────────────────
    
    const { data: agendamentosHoje } = await supabase
      .from('agendamentos')
      .select('valor_total')
      .eq('tenant_id', tenantId)
      .eq('status', 'concluido')
      .gte('data_hora_inicio', inicioHoje)
      .lte('data_hora_inicio', fimHoje)

    const receitaDia = agendamentosHoje?.reduce((acc, curr) => acc + (curr.valor_total || 0), 0) || 0
    const agendamentosConcluidosHoje = agendamentosHoje?.length || 0
    const ticketMedioHoje = agendamentosConcluidosHoje > 0 ? receitaDia / agendamentosConcluidosHoje : 0

    return new Response(
      JSON.stringify({
        // KPIs do Dia (Página Início)
        receita_dia: receitaDia,
        ticket_medio_dia: ticketMedioHoje,
        agendamentos_concluidos_dia: agendamentosConcluidosHoje,
        
        // KPIs do Mês (Página Financeiro)
        receita_mes: receitaMes,
        despesa_mes: despesaMes,
        lucro_mes: lucroMes,
        ticket_medio_mes: ticketMedioMes,
        variacao_receita: variacaoReceita,
        
        // Gráficos e Listas
        grafico_receita_30d: graficoReceita,
        top_despesas: topDespesas,
        proximas_contas: proximasContas,
        
        // Alertas
        caixa_aberto_hoje: !!caixaHoje,
        comissoes_mes: comissoesPendentes,
        pendencias_categorizacao: lancamentosSemCategoria || 0,
        
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        status: 200 
      }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
