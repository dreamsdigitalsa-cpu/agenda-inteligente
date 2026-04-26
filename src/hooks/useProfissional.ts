import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from './useTenant'

export interface ProfissionalLogado {
  id: string
  nome: string
  especialidade: string | null
  telefone: string | null
  comissao_tipo: 'percentual' | 'fixo'
  comissao_valor: number
  foto_url: string | null
  bio: string | null
}

/**
 * Hook que retorna o registro de profissional vinculado ao usuário logado.
 * Usado para filtrar agenda, clientes e comissões pelo profissional atual.
 */
export function useProfissional() {
  const { usuario, carregando: usuarioCarregando } = useTenant()
  const [profissional, setProfissional] = useState<ProfissionalLogado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    // Aguarda o carregamento do usuário
    if (usuarioCarregando) return

    // Se não há usuário logado, não há profissional vinculado
    if (!usuario?.id) {
      setProfissional(null)
      setCarregando(false)
      return
    }

    let cancelado = false

    const buscar = async () => {
      try {
        const { data, error } = await supabase
          .from('profissionais')
          .select('id, nome, especialidade, telefone, comissao_tipo, comissao_valor, foto_url, bio')
          .eq('usuario_id', usuario.id)
          .eq('ativo', true)
          .maybeSingle()

        if (cancelado) return
        if (error) throw error

        setProfissional(data as ProfissionalLogado | null)
      } catch (e) {
        if (!cancelado) {
          console.error('[useProfissional] erro:', e)
          setErro(e instanceof Error ? e.message : 'erro_desconhecido')
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    buscar()
    return () => { cancelado = true }
  }, [usuario?.id, usuarioCarregando])

  return { profissional, carregando, erro }
}
