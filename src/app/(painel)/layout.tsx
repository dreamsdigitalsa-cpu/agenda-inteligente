// Layout do painel autenticado (tenant).
// Aqui devem entrar: sidebar, header, guard de autenticação e provider de tenant.
import type { ReactNode } from 'react'

const LayoutPainel = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>
}
export default LayoutPainel
