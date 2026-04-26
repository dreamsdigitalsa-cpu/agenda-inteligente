// Hook para consumo da agenda — busca agendamentos do dia (ou intervalo)
// e mantém atualização em tempo real via Supabase Realtime.
// Sem cache (POLITICA_CACHE.AGENDA_DO_DIA = 0).
//
// Suporta filtros opcionais:
//   - profissionalId: restringe à agenda de um único profissional (usado no painel do profissional)
//   - incluirBloqueios: também carrega bloqueios_agenda no mesmo intervalo
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from './useTenant'

export interface AgendamentoDetalhado {
  id: string
  tenant_id: string
  unidade_id: string | null
  cliente_id: string
  profissional_id: string
  servico_id: string
  data_hora_inicio: string
  data_hora_fim: string
  status: 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'faltou'
  origem: 'painel' | 'online' | 'whatsapp' | 'telefone'
  confirmacao_manual_necessaria: boolean
  observacoes: string | null
  // Joins (carregados via map externo, não no select):
  cliente_nome?: string
  profissional_nome?: string
  servico_nome?: string
}

// Bloqueio de agenda (folga, almoço, atestado, etc.)
export interface BloqueioAgenda {
  id: string
  tenant_id: string
  profissional_id: string
  inicio: string
  fim: string
  tipo: string
  motivo: string | null
}

export interface OpcoesAgenda {
  profissionalId?: string
  incluirBloqueios?: boolean
}

export function useAgenda(inicio: Date, fim: Date, opcoes?: OpcoesAgenda) {
  const { tenant } = useTenant()
  const [agendamentos, setAgendamentos] = useState<AgendamentoDetalhado[]>([])
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizadoAgora, setAtualizadoAgora] = useState(false)

  // Extrai opções (estabiliza como primitivos para o useCallback)
  const profissionalIdFiltro = opcoes?.profissionalId
  const incluirBloqueios = !!opcoes?.incluirBloqueios

  const carregar = useCallback(async () => {
    if (!tenant?.id) return
    setCarregando(true)

    // Query base de agendamentos
    let query = supabase
      .from('agendamentos')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('data_hora_inicio', inicio.toISOString())
      .lt('data_hora_inicio', fim.toISOString())
      .order('data_hora_inicio', { ascending: true })

    // Filtro opcional: agenda de um único profissional
    if (profissionalIdFiltro) {
      query = query.eq('profissional_id', profissionalIdFiltro)
    }

    const { data, error } = await query

    if (!error && data) {
      // Enriquecer com nomes (cliente, profissional, serviço) em paralelo
      const ids = {
        clientes: [...new Set(data.map((a) => a.cliente_id))],
        prof: [...new Set(data.map((a) => a.profissional_id))],
        serv: [...new Set(data.map((a) => a.servico_id))],
      }
      const [{ data: cs }, { data: ps }, { data: ss }] = await Promise.all([
        supabase.from('clientes').select('id, nome').in('id', ids.clientes.length ? ids.clientes : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('profissionais').select('id, nome').in('id', ids.prof.length ? ids.prof : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('servicos').select('id, nome').in('id', ids.serv.length ? ids.serv : ['00000000-0000-0000-0000-000000000000']),
      ])
      const mapC = new Map((cs ?? []).map((c) => [c.id, c.nome]))
      const mapP = new Map((ps ?? []).map((p) => [p.id, p.nome]))
      const mapS = new Map((ss ?? []).map((s) => [s.id, s.nome]))
      setAgendamentos(
        data.map((a) => ({
          ...a,
          cliente_nome: mapC.get(a.cliente_id),
          profissional_nome: mapP.get(a.profissional_id),
          servico_nome: mapS.get(a.servico_id),
        })) as AgendamentoDetalhado[],
      )
    }

    // Carrega bloqueios no mesmo intervalo (opcional)
    if (incluirBloqueios) {
      let qb = supabase
        .from('bloqueios_agenda')
        .select('id, tenant_id, profissional_id, inicio, fim, tipo, motivo')
        .eq('tenant_id', tenant.id)
        // intersecta o intervalo [inicio, fim): bloqueio.inicio < fim AND bloqueio.fim > inicio
        .lt('inicio', fim.toISOString())
        .gt('fim', inicio.toISOString())

      if (profissionalIdFiltro) {
        qb = qb.eq('profissional_id', profissionalIdFiltro)
      }

      const { data: bloqs } = await qb
      setBloqueios((bloqs ?? []) as BloqueioAgenda[])
    } else {
      setBloqueios([])
    }

    setCarregando(false)
  }, [tenant?.id, inicio.toISOString(), fim.toISOString(), profissionalIdFiltro, incluirBloqueios])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Realtime: escuta toda mudança em agendamentos do tenant atual
  useEffect(() => {
    if (!tenant?.id) return
    const canal = supabase
      .channel(`agendamentos-${tenant.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos', filter: `tenant_id=eq.${tenant.id}` },
        () => {
          // Recarrega e mostra indicador
          carregar()
          setAtualizadoAgora(true)
          setTimeout(() => setAtualizadoAgora(false), 2500)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [tenant?.id, carregar])

  return { agendamentos, bloqueios, carregando, atualizadoAgora, recarregar: carregar }
}
