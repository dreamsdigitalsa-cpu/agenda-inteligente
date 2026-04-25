// Layout visual do painel autenticado (tenant).
// Renderizado dentro de <RotaProtegida> e envolve as páginas filhas via <Outlet />.
// Exibe banner de impersonação quando um super admin está visualizando o tenant.
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import { AlertTriangle, Menu, ShieldCheck, Sparkles } from 'lucide-react'
import { usePermissao } from '@/hooks/usePermissao'
import { SidebarPainel } from './SidebarPainel'
import { HeaderPainel } from './HeaderPainel'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

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
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground shadow">
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4" />
        Você está visualizando como <strong>{tenantNome}</strong>
      </span>
      <button
        onClick={sairImpersonacao}
        className="rounded border border-warning-foreground/40 bg-warning-foreground/10 px-3 py-0.5 text-xs transition-colors hover:bg-warning-foreground/20"
      >
        Sair da impersonação
      </button>
    </div>
  )
}

export const LayoutPainel = () => {
  const { ehSuperAdmin } = usePermissao()

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SidebarPainel />

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Cabeçalho mobile com gatilho da sidebar */}
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-auto" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarPainel />
            </SheetContent>
          </Sheet>
        </div>

        {ehSuperAdmin && (
          <div className="flex items-center justify-between border-b border-border bg-foreground/5 px-4 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Você é um Super Admin
            </span>
            <Link
              to="/super-admin/dashboard"
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Voltar para Gestão Global
            </Link>
          </div>
        )}
        <BannerImpersonacao />

        <HeaderPainel />

        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default LayoutPainel
