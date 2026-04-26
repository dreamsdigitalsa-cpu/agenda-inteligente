// Hook central de permissões.
// - temRole(role): verifica papéis (super_admin, admin, etc.) — vem da tabela user_roles
// - temPermissao(codigo): verifica permissões granulares (PERM-001 etc.) — derivadas do perfil do usuário
// Super admin sempre passa em qualquer verificação.
import { useCallback, useEffect, useState } from 'react'
import { useTenant } from './useTenant'
import { supabase } from '@/lib/supabase/cliente'
import type { AppRole } from '@/tipos/usuario'

export function usePermissao() {
  const { usuario, carregando } = useTenant()
  const [permissoes, setPermissoes] = useState<string[]>([])

  // Carrega códigos de permissão do perfil do usuário (lido via join no banco).
  // Se o usuário não tiver perfil, lista fica vazia (apenas super_admin contorna).
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      if (!usuario?.id) {
        setPermissoes([])
        return
      }
      // Busca perfil_id do usuário e suas permissões em paralelo
      const { data: u } = await supabase
        .from('usuarios')
        .select('perfil_id')
        .eq('id', usuario.id)
        .maybeSingle()
      if (cancelado) return
      const perfilId = (u as { perfil_id: string | null } | null)?.perfil_id
      if (!perfilId) {
        setPermissoes([])
        return
      }
      const { data: rows } = await supabase
        .from('permissoes_do_perfil')
        .select('codigo_permissao')
        .eq('perfil_id', perfilId)
      if (cancelado) return
      setPermissoes((rows ?? []).map((r) => r.codigo_permissao as string))
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [usuario?.id])

  const temRole = useCallback(
    (role: AppRole): boolean => {
      if (!usuario) return false
      if (usuario.roles.includes('super_admin')) return true
      return usuario.roles.includes(role)
    },
    [usuario],
  )

  // Verificação de permissão granular. Super admin sempre true.
  const temPermissao = useCallback(
    (codigo: string): boolean => {
      if (!usuario) return false
      if (usuario.roles.includes('super_admin')) return true
      return permissoes.includes(codigo)
    },
    [usuario, permissoes],
  )

  const ehSuperAdmin = !!usuario?.roles?.includes('super_admin')
  const ehAdmin = !!usuario?.roles?.includes('admin') || ehSuperAdmin
  const ehProfissional = !!usuario?.roles?.includes('profissional')
  const ehRecepcionista = !!usuario?.roles?.includes('recepcionista')

  return { 
    temRole, 
    temPermissao, 
    ehSuperAdmin, 
    ehAdmin, 
    ehProfissional, 
    ehRecepcionista, 
    permissoesUsuario: permissoes,
    carregando
  }
}
