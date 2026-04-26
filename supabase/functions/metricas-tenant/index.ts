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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      console.error('[metricas-tenant] auth error:', userError)
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = userData.user.id

    // Buscar tenant_id do usuário (via auth_user_id)
    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('id, tenant_id, unidade_id')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (perfilError || !perfil?.tenant_id) {
      return new Response(JSON.stringify({ error: 'Tenant não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const tenantId = perfil.tenant_id
    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999).toISOString()
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

    // KPIs do dia (a partir de agendamentos concluídos via servico.preco_centavos)
    const { data: agendamentosHoje } = await supabase
      .from('agendamentos')
      .select('id, servico:servicos(preco_centavos)')
      .eq('tenant_id', tenantId)
      .eq('status', 'concluido')
      .gte('data_hora_inicio', inicioHoje)
      .lte('data_hora_inicio', fimHoje)

    const receitaDia = (agendamentosHoje || []).reduce(
      (acc: number, a: any) => acc + ((a.servico?.preco_centavos || 0) / 100),
      0
    )
    const agendamentosConcluidosHoje = agendamentosHoje?.length || 0
    const ticketMedioHoje = agendamentosConcluidosHoje > 0 ? receitaDia / agendamentosConcluidosHoje : 0

    // KPIs do mês
    const { data: agendamentosMes } = await supabase
      .from('agendamentos')
      .select('id, servico:servicos(preco_centavos)')
      .eq('tenant_id', tenantId)
      .eq('status', 'concluido')
      .gte('data_hora_inicio', primeiroDiaMes)

    const receitaMes = (agendamentosMes || []).reduce(
      (acc: number, a: any) => acc + ((a.servico?.preco_centavos || 0) / 100),
      0
    )
    const concluidosMes = agendamentosMes?.length || 0
    const ticketMedioMes = concluidosMes > 0 ? receitaMes / concluidosMes : 0

    return new Response(
      JSON.stringify({
        receita_dia: receitaDia,
        ticket_medio_dia: ticketMedioHoje,
        agendamentos_concluidos_dia: agendamentosConcluidosHoje,
        receita_mes: receitaMes,
        despesa_mes: 0,
        lucro_mes: receitaMes,
        ticket_medio_mes: ticketMedioMes,
        variacao_receita: 0,
        grafico_receita_30d: [],
        top_despesas: [],
        proximas_contas: [],
        caixa_aberto_hoje: false,
        comissoes_mes: 0,
        pendencias_categorizacao: 0,
        estoque_baixo: 0,
        validade_proxima: 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('[metricas-tenant] erro:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
