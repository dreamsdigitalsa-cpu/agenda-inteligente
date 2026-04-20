// Layout visual do painel autenticado (tenant).
// Renderizado dentro de <RotaProtegida> e envolve as páginas filhas via <Outlet />.
// Exibe banner de impersonação quando um super admin está visualizando o tenant.
import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import { AlertTriangle } from 'lucide-react'

function BannerImpersonacao() {
  const navigate = useNavigate()
  const raw = sessionStorage.getItem('impersonando')
  if (!raw) return null

  const { tenantNome } = JSON.parse(raw) as { tenantNome: string }

  async function sairImpersonacao() {
    const savedRaw = sessionStorage.getItem('super_admin_session')
    sessionStorage.removeItem('impersonando')
    sessionStorage.removeItem('super_admin_session')

    if (savedRaw) {
      const { access_token, refresh_token } = JSON.parse(savedRaw)
      await supabase.auth.setSession({ access_token, refresh_token })
    } else {
      await supabase.auth.signOut()
    }
    navigate('/super-admin/tenants')
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-amber-950 text-sm font-medium shadow">
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4" />
        Você está visualizando como <strong>{tenantNome}</strong>
      </span>
      <button
        onClick={sairImpersonacao}
        className="rounded border border-amber-700 bg-amber-600/20 px-3 py-0.5 text-xs hover:bg-amber-600/40 transition-colors"
      >
        Sair da impersonação
      </button>
    </div>
  )
}

export const LayoutPainel = () => {
  return (
    <div className="min-h-screen">
      <BannerImpersonacao />
      {/* TODO: sidebar + header do painel */}
      <Outlet />
    </div>
  )
}

export default LayoutPainel
