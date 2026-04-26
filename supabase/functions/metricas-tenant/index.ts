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
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (perfilError || !perfil) throw new Error('Tenant não encontrado')

    const tenantId = perfil.tenant_id
    const hoje = new Date().toISOString().split('T')[0]

    // 1. Receita do dia (Agendamentos concluídos hoje)
    // Nota: Como não temos tabela de 'lancamentos' financeira explícita nos arquivos lidos, 
    // vamos basear no valor dos agendamentos concluídos para este exemplo.
    const { data: agendamentosHoje, error: errorReceita } = await supabase
      .from('agendamentos')
      .select('valor_total')
      .eq('tenant_id', tenantId)
      .eq('status', 'concluido')
      .gte('data', hoje)
      .lt('data', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0])

    const receitaDia = agendamentosHoje?.reduce((acc, curr) => acc + (curr.valor_total || 0), 0) || 0
    const agendamentosConcluidos = agendamentosHoje?.length || 0
    const ticketMedio = agendamentosConcluidos > 0 ? receitaDia / agendamentosConcluidos : 0

    // 2. Comissões pendentes (Placeholder - assumindo lógica de negócio)
    const comissoesPendentes = 0 // Implementar lógica real quando as tabelas financeiras forem mapeadas

    // 3. Receita dos últimos 7 dias para o gráfico
    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
    
    const { data: dadosGraficoRaw } = await supabase
      .from('agendamentos')
      .select('valor_total, data')
      .eq('tenant_id', tenantId)
      .eq('status', 'concluido')
      .gte('data', seteDiasAtras.toISOString().split('T')[0])

    // Agrupar por data
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const graficoReceita = ultimos7Dias.map(data => {
      const total = dadosGraficoRaw
        ?.filter(a => a.data === data)
        .reduce((acc, curr) => acc + (curr.valor_total || 0), 0) || 0
      return { data, total }
    })

    return new Response(
      JSON.stringify({
        receita_dia: receitaDia,
        ticket_medio: ticketMedio,
        agendamentos_concluidos: agendamentosConcluidos,
        comissoes_pendentes: comissoesPendentes,
        grafico_receita: graficoReceita,
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
