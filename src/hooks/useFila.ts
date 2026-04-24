import { useState, useEffect, useCallback } from 'react'
import { FilaServico } from '@/servicos/fila/fila-servico'
import type { ItemFila } from '@/tipos/fila'
import { supabase } from '@/lib/supabase/cliente'
import { useToast } from '@/hooks/use-toast'

export function useFila(tenantId?: string, unidadeId?: string) {
  const [fila, setFila] = useState<ItemFila[]>([])
  const [carregando, setCarregando] = useState(true)
  const { toast } = useToast()

  const carregarFila = useCallback(async () => {
    if (!tenantId || !unidadeId) return
    try {
      const data = await FilaServico.listar(tenantId, unidadeId)
      setFila(data)
    } catch (error) {
      console.error('Erro ao carregar fila:', error)
    } finally {
      setCarregando(false)
    }
  }, [tenantId, unidadeId])

  useEffect(() => {
    if (!tenantId || !unidadeId) return

    carregarFila()

    // Realtime subscription
    const canal = supabase
      .channel('alteracoes_fila')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_espera',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          carregarFila()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [tenantId, unidadeId, carregarFila])

  const adicionarNaFila = async (dados: Partial<ItemFila>) => {
    try {
      await FilaServico.adicionar({ ...dados, tenantId, unidadeId })
      toast({ title: 'Cliente adicionado à fila' })
    } catch (error) {
      toast({ title: 'Erro ao adicionar na fila', variant: 'destructive' })
    }
  }

  const chamarProximo = async (id: string) => {
    try {
      await FilaServico.chamarProximo(id)
      toast({ title: 'Cliente chamado!' })
    } catch (error) {
      toast({ title: 'Erro ao chamar cliente', variant: 'destructive' })
    }
  }

  const finalizarAtendimento = async (id: string) => {
    try {
      await FilaServico.finalizar(id)
      toast({ title: 'Atendimento finalizado' })
    } catch (error) {
      toast({ title: 'Erro ao finalizar atendimento', variant: 'destructive' })
    }
  }

  const reordenarFila = async (novosItens: ItemFila[]) => {
    setFila(novosItens) // Otimista
    try {
      const updates = novosItens.map((item, index) => ({
        id: item.id,
        posicao: index + 1
      }))
      await FilaServico.reordenar(updates)
    } catch (error) {
      carregarFila() // Reverte em caso de erro
      toast({ title: 'Erro ao reordenar fila', variant: 'destructive' })
    }
  }

  return {
    fila,
    carregando,
    adicionarNaFila,
    chamarProximo,
    finalizarAtendimento,
    reordenarFila,
    atualizar: carregarFila
  }
}
