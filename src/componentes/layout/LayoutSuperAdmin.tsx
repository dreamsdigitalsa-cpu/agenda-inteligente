// Layout visual do painel super admin.
// Sidebar de navegação lateral + banner de impersonação quando ativo.
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import {
  LayoutDashboard, Building2, CreditCard,
  Plug, BarChart3, LogOut, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const itensNav = [
  { href: '/super-admin/dashboard',   icone: LayoutDashboard, rotulo: 'Dashboard'   },
  { href: '/super-admin/tenants',     icone: Building2,       rotulo: 'Tenants'     },
  { href: '/super-admin/planos',      icone: CreditCard,      rotulo: 'Planos'      },
  { href: '/super-admin/integracoes', icone: Plug,            rotulo: 'Integrações' },
  { href: '/super-admin/financeiro',  icone: BarChart3,       rotulo: 'Financeiro'  },
  { href: '/super-admin/equipe',      icone: Users,           rotulo: 'Minha Equipe' },
  { href: '/painel/agenda',           icone: Shield,          rotulo: 'Painel Normal' },
]

export const LayoutSuperAdmin = () => {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden flex-col md:flex-row">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-56 shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900">
        {/* Marca */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-800">
          <Shield className="h-5 w-5 text-violet-400" />
          <span className="font-semibold text-sm tracking-wide">Super Admin</span>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {itensNav.map(({ href, icone: Icone, rotulo }) => (
            <NavLink
              key={href}
              to={href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                )
              }
            >
              <Icone className="h-4 w-4 shrink-0" />
              {rotulo}
            </NavLink>
          ))}
        </nav>

        {/* Sair */}
        <div className="px-2 pb-4">
          <button
            onClick={sair}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default LayoutSuperAdmin
