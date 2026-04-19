// Hook para verificar papéis (roles) do usuário logado.
// Roles vêm da tabela user_roles, lida via useTenant.
// Sempre usar este hook antes de renderizar ações sensíveis.
import { useCallback } from 'react'
import { useTenant } from './useTenant'
import type { AppRole } from '@/tipos/usuario'

export function usePermissao() {
  const { usuario } = useTenant()

  const temRole = useCallback(
    (role: AppRole): boolean => {
      if (!usuario) return false
      if (usuario.roles.includes('super_admin')) return true
      return usuario.roles.includes(role)
    },
    [usuario],
  )

  const ehSuperAdmin = !!usuario?.roles.includes('super_admin')
  const ehAdmin = !!usuario?.roles.includes('admin') || ehSuperAdmin

  return { temRole, ehSuperAdmin, ehAdmin }
}
