// Tipos do usuário autenticado e seus papéis (roles).
// IMPORTANTE: roles vêm da tabela `user_roles`, NUNCA de uma coluna em `usuarios`.
// Isso previne escalada de privilégios.
export type AppRole = 'super_admin' | 'admin' | 'profissional' | 'recepcionista'

export interface UsuarioLogado {
  id: string
  authUserId: string
  tenantId: string | null
  unidadeId: string | null
  nome: string
  email: string
  ativo: boolean
  roles: AppRole[]
}
