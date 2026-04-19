// Layout visual do super admin.
// Renderizado dentro de <RotaSuperAdmin> e envolve as páginas filhas via <Outlet />.
import { Outlet } from 'react-router-dom'

export const LayoutSuperAdmin = () => {
  return (
    <div className="min-h-screen">
      {/* TODO: sidebar + header do super admin */}
      <Outlet />
    </div>
  )
}

export default LayoutSuperAdmin
