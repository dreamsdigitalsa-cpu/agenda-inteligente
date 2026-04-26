// Edge Function: metricas-super-admin
// Retorna todas as métricas do dashboard do super admin.
// NUNCA expõe dados de um tenant para outro; apenas agrega contagens.
//
// Segurança:
//   - Verifica role super_admin na tabela user_roles via service_role.
//   - Todas as queries são agregações globais sem expor registros individuais
//     (exceto top_tenants que retorna nome + contagem de agendamentos).
//
// Métricas retornadas:
//   - tenants: { total, ativos, suspensos, cancelados, bloqueados }
//   - mrr_centavos: receita mensal recorrente (tenants ativos x preço do plano)
//   - novos: { hoje, semana, mes }
//   - churn_mes: tenants cancelados/suspensos neste mês
//   - por_segmento: [{ segmento, total }]
//   - por_plano: [{ plano, total }]
//   - top_tenants: [{ id, nome, agendamentos_mes }]
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Validar autenticação via JWT
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

    // 2. Verificar role super_admin (leitura direta via service_role — inviolável)
    const supaAdmin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await supaAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authUserId)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (!roleRow) return json({ erro: 'acesso_negado', detalhe: 'requer role super_admin' }, 403)

    // 3. Executar queries de métricas em paralelo
    const agora = new Date()
    const inicioDoDia   = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
    const inicioSemana  = new Date(agora.getTime() - 7  * 24 * 3600_000).toISOString()
    const inicioMes     = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    const [
      { data: tenantRows   },
      { data: planoRows    },
      { data: segmentoRows },
      { data: novosRows    },
      { data: churnRows    },
      { data: topRows      },
    ] = await Promise.all([
      // Contagem de tenants por status
      supaAdmin.from('tenants').select('status'),

      // Contagem de tenants por plano (usando coluna plano::text para join)
      supaAdmin.from('tenants').select('plano'),

      // Distribuição por segmento
      supaAdmin.from('tenants').select('segmento'),

      // Novos cadastros por período
      supaAdmin.from('tenants').select('criado_em'),

      // Churn: tenants cancelados OU bloqueados neste mês
      supaAdmin
        .from('tenants')
        .select('id, atualizado_em')
        .in('status', ['cancelado', 'bloqueado', 'suspenso'])
        .gte('atualizado_em', inicioMes),

      // Top 10 tenants por agendamentos neste mês
      supaAdmin
        .from('agendamentos')
        .select('tenant_id, tenants!inner(nome)')
        .gte('criado_em', inicioMes),
    ])

    // ── Processar métricas ────────────────────────────────────────────────────

    // Tenants por status
    const tenants = (tenantRows ?? []) as Array<{ status: string }>
    const statusCount = {
      total:      tenants.length,
      ativos:     tenants.filter((t) => t.status === 'ativo').length,
      suspensos:  tenants.filter((t) => t.status === 'suspenso').length,
      cancelados: tenants.filter((t) => t.status === 'cancelado').length,
      bloqueados: tenants.filter((t) => t.status === 'bloqueado').length,
      em_trial:   tenants.filter((t) => t.status === 'trial').length,
    }

    // MRR: mapa hardcoded de preços por plano (slug → centavos).
    // TODO: substituir por query .from('planos') quando a tabela estiver no schema gerado.
    const PRECO_POR_PLANO: Record<string, number> = {
      freemium:     0,
      basico:       4900,   // R$ 49,00
      profissional: 9900,   // R$ 99,00
    }
    const tenantsPorPlano = (planoRows ?? []) as Array<{ plano: string }>

    // MRR apenas de tenants ativos
    const { data: ativosPlanoRows } = await supaAdmin
      .from('tenants')
      .select('plano')
      .eq('status', 'ativo')
    const mrrCentavos = (ativosPlanoRows ?? []).reduce((acc: number, t: { plano: string }) => {
      return acc + (PRECO_POR_PLANO[t.plano] ?? 0)
    }, 0)

    // Novos cadastros
    const criados = (novosRows ?? []) as Array<{ criado_em: string }>
    const novos = {
      hoje:   criados.filter((t) => t.criado_em >= inicioDoDia).length,
      semana: criados.filter((t) => t.criado_em >= inicioSemana).length,
      mes:    criados.filter((t) => t.criado_em >= inicioMes).length,
    }

    // Churn do mês
    const churnMes = (churnRows ?? []).length

    // Distribuição por segmento
    const segmentos = (segmentoRows ?? []) as Array<{ segmento: string }>
    const porSegmento = Object.entries(
      segmentos.reduce((acc: Record<string, number>, t) => {
        acc[t.segmento] = (acc[t.segmento] ?? 0) + 1
        return acc
      }, {}),
    )
      .map(([segmento, total]) => ({ segmento, total }))
      .sort((a, b) => b.total - a.total)

    // Distribuição por plano
    const porPlano = Object.entries(
      tenantsPorPlano.reduce((acc: Record<string, number>, t) => {
        acc[t.plano] = (acc[t.plano] ?? 0) + 1
        return acc
      }, {}),
    )
      .map(([plano, total]) => ({ plano, total }))
      .sort((a, b) => b.total - a.total)

    // Top 10 por agendamentos
    const agendamentos = (topRows ?? []) as Array<{ tenant_id: string; tenants: { nome: string } }>
    const contagemPorTenant: Record<string, { nome: string; agendamentos_mes: number }> = {}
    for (const ag of agendamentos) {
      const tid = ag.tenant_id
      if (!contagemPorTenant[tid]) {
        contagemPorTenant[tid] = { nome: (ag.tenants as { nome: string }).nome, agendamentos_mes: 0 }
      }
      contagemPorTenant[tid].agendamentos_mes++
    }
    const topTenants = Object.entries(contagemPorTenant)
      .map(([id, dados]) => ({ id, ...dados }))
      .sort((a, b) => b.agendamentos_mes - a.agendamentos_mes)
      .slice(0, 10)

    return json({
      tenants:     statusCount,
      mrr_centavos: mrrCentavos,
      novos,
      churn_mes:   churnMes,
      por_segmento: porSegmento,
      por_plano:    porPlano,
      top_tenants:  topTenants,
      gerado_em:    agora.toISOString(),
    })
  } catch (e) {
    console.error('[metricas-super-admin] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
