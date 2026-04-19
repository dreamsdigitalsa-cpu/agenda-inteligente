// Tipos do usuário autenticado dentro de um tenant
import type { CodigoPermissao } from '../lib/constantes/permissoes'

export type PerfilUsuario =
  | 'super_admin'
  | 'dono'
  | 'gerente'
  | 'profissional'
  | 'recepcao'

export interface Usuario {
  id: string
  tenantId: string | null
  nome: string
  email: string
  perfil: PerfilUsuario
  permissoes?: CodigoPermissao[]
}
