// Hook: lista de profissionais do tenant.
// Cache de 15 minutos em memória (POLITICA_CACHE.CONFIGURACOES_TENANT).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from './useTenant'

export interface Profissional {
  id: string
  nome: string
  especialidade: string | null
  ativo: boolean
}

const cache = new Map<string, { dados: Profissional[]; expira: number }>()
const TTL = 15 * 60 * 1000

export function useProfissionais() {
  const { tenant } = useTenant()
  const [dados, setDados] = useState<Profissional[]>([])
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
      .from('profissionais')
      .select('id, nome, especialidade, ativo')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        const lista = (data ?? []) as Profissional[]
        cache.set(tenant.id, { dados: lista, expira: Date.now() + TTL })
        setDados(lista)
        setCarregando(false)
      })
  }, [tenant?.id])

  return { profissionais: dados, carregando }
}
