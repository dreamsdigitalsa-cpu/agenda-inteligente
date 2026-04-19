// Hook para verificar permissões do usuário logado
// Sempre usar este hook antes de renderizar ações sensíveis
// Nunca verificar permissão manualmente fora deste hook
import { useCallback } from 'react'
import { useTenant } from './useTenant'
import type { CodigoPermissao } from '../lib/constantes/permissoes'

export function usePermissao() {
  const { usuario } = useTenant()

  const temPermissao = useCallback((codigo: CodigoPermissao): boolean => {
    if (!usuario) return false
    if (usuario.perfil === 'super_admin') return true
    return usuario.permissoes?.includes(codigo) ?? false
  }, [usuario])

  return { temPermissao }
}
