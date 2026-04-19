// Layout do super admin (visão global do SaaS).
// Acesso restrito a usuários com perfil 'super_admin'.
import type { ReactNode } from 'react'

const LayoutSuperAdmin = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>
}
export default LayoutSuperAdmin
