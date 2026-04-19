// Hook para consumo da agenda — busca agendamentos do dia (ou intervalo)
// e mantém atualização em tempo real via Supabase Realtime.
// Sem cache (POLITICA_CACHE.AGENDA_DO_DIA = 0).
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

export function useAgenda(inicio: Date, fim: Date) {
  const { tenant } = useTenant()
  const [agendamentos, setAgendamentos] = useState<AgendamentoDetalhado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizadoAgora, setAtualizadoAgora] = useState(false)

  const carregar = useCallback(async () => {
    if (!tenant?.id) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('data_hora_inicio', inicio.toISOString())
      .lt('data_hora_inicio', fim.toISOString())
      .order('data_hora_inicio', { ascending: true })

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
    setCarregando(false)
  }, [tenant?.id, inicio.toISOString(), fim.toISOString()])

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

  return { agendamentos, carregando, atualizadoAgora, recarregar: carregar }
}
