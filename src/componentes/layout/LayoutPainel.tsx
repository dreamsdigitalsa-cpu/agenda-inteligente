// Layout visual do painel autenticado (tenant).
// Renderizado dentro de <RotaProtegida> e envolve as páginas filhas via <Outlet />.
// Exibe banner de impersonação quando um super admin está visualizando o tenant.
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import { AlertTriangle, ShieldCheck, Menu } from 'lucide-react'
import { usePermissao } from '@/hooks/usePermissao'
import { SidebarPainel } from './SidebarPainel'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

function BannerImpersonacao() {
  const navigate = useNavigate()
  const raw = sessionStorage.getItem('impersonando')
  if (!raw) return null

  let tenantNome = ''
  try {
    const data = JSON.parse(raw)
    tenantNome = data.tenantNome
  } catch (e) {
    console.error('Erro ao ler dados de impersonação:', e)
    return null
  }

  async function sairImpersonacao() {
    const savedRaw = sessionStorage.getItem('super_admin_session')
    sessionStorage.removeItem('impersonando')
    sessionStorage.removeItem('super_admin_session')

    if (savedRaw) {
      try {
        const { access_token, refresh_token } = JSON.parse(savedRaw)
        await supabase.auth.setSession({ access_token, refresh_token })
      } catch (e) {
        await supabase.auth.signOut()
      }
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
  const { ehSuperAdmin } = usePermissao()

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      <SidebarPainel />

      {/* Mobile Nav */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
        <h2 className="font-bold text-lg tracking-tight text-zinc-900">
          Beleza<span className="text-violet-600">F3</span>
        </h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarPainel />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        {ehSuperAdmin && (
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
              Você é um Super Admin
            </span>
            <Link 
              to="/super-admin/dashboard" 
              className="text-xs text-violet-400 hover:text-violet-300 underline"
            >
              Voltar para Gestão Global
            </Link>
          </div>
        )}
        <BannerImpersonacao />
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default LayoutPainel
