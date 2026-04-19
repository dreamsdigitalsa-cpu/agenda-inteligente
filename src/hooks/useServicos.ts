// Hook: lista de serviços do tenant. Cache de 1 hora (POLITICA_CACHE.LISTA_SERVICOS).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from './useTenant'

export interface Servico {
  id: string
  nome: string
  duracao_minutos: number
  preco_centavos: number
}

const cache = new Map<string, { dados: Servico[]; expira: number }>()
const TTL = 60 * 60 * 1000

export function useServicos() {
  const { tenant } = useTenant()
  const [dados, setDados] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!tenant?.id) return
    const ch = cache.get(tenant.id)
    if (ch && ch.expira > Date.now()) {
      setDados(ch.dados)
      setCarregando(false)
      return
    }
    setCarregando(true)
    supabase
      .from('servicos')
      .select('id, nome, duracao_minutos, preco_centavos')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        const lista = (data ?? []) as Servico[]
        cache.set(tenant.id, { dados: lista, expira: Date.now() + TTL })
        setDados(lista)
        setCarregando(false)
      })
  }, [tenant?.id])

  return { servicos: dados, carregando }
}
