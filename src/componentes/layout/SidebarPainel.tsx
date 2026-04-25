// Sidebar do painel — visual inspirado na referência "Cascal".
// Suporta submenus colapsáveis, indicador lateral no item ativo,
// card "Setup do perfil" no rodapé e tema claro/escuro automático.
import { useMemo, useState, type ComponentType } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Image as ImageIcon,
  ListOrdered,
  Package,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AnelProgresso } from '@/componentes/ui/AnelProgresso'

interface ItemMenu {
  href: string
  rotulo: string
  icone: ComponentType<{ className?: string }>
  filhos?: { href: string; rotulo: string }[]
}

const grupoPrincipal: ItemMenu[] = [
  { href: '/painel/agenda', icone: Calendar, rotulo: 'Agenda' },
  {
    href: '/painel/clientes',
    icone: Users,
    rotulo: 'Clientes',
    filhos: [
      { href: '/painel/clientes', rotulo: 'Lista de clientes' },
    ],
  },
  {
    href: '/painel/financeiro',
    icone: DollarSign,
    rotulo: 'Financeiro',
    filhos: [
      { href: '/painel/financeiro', rotulo: 'Resumo' },
      { href: '/painel/financeiro/caixa', rotulo: 'Caixa' },
    ],
  },
  { href: '/painel/estoque', icone: Package, rotulo: 'Estoque' },
  { href: '/painel/fila', icone: ListOrdered, rotulo: 'Fila de espera' },
  { href: '/painel/relatorios', icone: BarChart3, rotulo: 'Relatórios' },
]

const grupoTatuagem: ItemMenu[] = [
  { href: '/painel/tatuagem/orcamentos', icone: FileText, rotulo: 'Orçamentos' },
  { href: '/painel/tatuagem/portfolio', icone: ImageIcon, rotulo: 'Portfólio' },
]

const grupoPreferencias: ItemMenu[] = [
  {
    href: '/painel/configuracoes',
    icone: Settings,
    rotulo: 'Configurações',
    filhos: [
      { href: '/painel/configuracoes', rotulo: 'Geral' },
      { href: '/painel/configuracoes/notificacoes', rotulo: 'Notificações' },
      { href: '/painel/configuracoes/ligacao-ia', rotulo: 'Ligação IA' },
    ],
  },
  { href: '/painel/assinatura', icone: CreditCard, rotulo: 'Minha assinatura' },
]

interface ItemProps {
  item: ItemMenu
  pathname: string
}

function ItemSidebar({ item, pathname }: ItemProps) {
  const ehAtivo = pathname === item.href || pathname.startsWith(item.href + '/')
  const [aberto, setAberto] = useState(ehAtivo)
  const Icone = item.icone

  if (!item.filhos?.length) {
    return (
      <NavLink
        to={item.href}
        end={item.href === '/painel'}
        className={({ isActive }) =>
          cn(
            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
            )}
            <Icone className="h-4 w-4" />
            <span>{item.rotulo}</span>
          </>
        )}
      </NavLink>
    )
  }

  return (
    <Collapsible open={aberto} onOpenChange={setAberto}>
      <CollapsibleTrigger
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          ehAtivo
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        )}
      >
        {ehAtivo && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
        )}
        <Icone className="h-4 w-4" />
        <span className="flex-1 text-left">{item.rotulo}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
          {item.filhos.map((f) => (
            <NavLink
              key={f.href}
              to={f.href}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'font-semibold text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground',
                )
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {f.rotulo}
            </NavLink>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function SidebarPainel() {
  const { tenant } = useTenant()
  const location = useLocation()
  const isTattoo = tenant?.segmento === 'tatuagem'

  // % fictícia de setup — pode ser conectada a dados reais depois
  const progressoSetup = useMemo(() => 60, [])

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <Logo className="h-8 w-auto" />
        <span className="ml-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Painel
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <div className="space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Menu principal
          </p>
          <NavLink
            to="/painel"
            end
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                )}
                <Home className="h-4 w-4" />
                Início
              </>
            )}
          </NavLink>
          {grupoPrincipal.map((it) => (
            <ItemSidebar key={it.href} item={it} pathname={location.pathname} />
          ))}
        </div>

        {isTattoo && (
          <div className="space-y-0.5">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tattoo studio
            </p>
            {grupoTatuagem.map((it) => (
              <ItemSidebar key={it.href} item={it} pathname={location.pathname} />
            ))}
          </div>
        )}

        <div className="space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Preferências
          </p>
          {grupoPreferencias.map((it) => (
            <ItemSidebar key={it.href} item={it} pathname={location.pathname} />
          ))}
        </div>
      </nav>

      {/* Card de setup do perfil */}
      <div className="px-4 pb-4 pt-2">
        <div className="rounded-2xl border border-sidebar-border bg-gradient-soft p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {tenant?.nome ?? 'Setup do perfil'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {progressoSetup}% concluído
              </p>
            </div>
            <AnelProgresso valor={progressoSetup} tamanho={42} espessura={4} />
          </div>
          <Button asChild size="sm" className="w-full rounded-full bg-gradient-primary text-xs font-semibold shadow-elegant hover:opacity-90">
            <NavLink to="/painel/configuracoes">Completar configuração</NavLink>
          </Button>
        </div>
      </div>
    </aside>
  )
}
