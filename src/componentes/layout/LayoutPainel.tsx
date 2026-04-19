// Layout visual do painel autenticado (tenant).
// Renderizado dentro de <RotaProtegida> e envolve as páginas filhas via <Outlet />.
// Aqui devem entrar futuramente: sidebar, header e providers de tenant.
import { Outlet } from 'react-router-dom'

export const LayoutPainel = () => {
  return (
    <div className="min-h-screen">
      {/* TODO: sidebar + header do painel */}
      <Outlet />
    </div>
  )
}

export default LayoutPainel
