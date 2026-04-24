import { NavLink } from 'react-router-dom';
import { 
  Calendar, Users, DollarSign, Package, BarChart3, 
  Settings, CreditCard, ListOrdered, FileText, Image as ImageIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/hooks/useTenant';

const itensBase = [
  { href: '/painel/agenda', icone: Calendar, rotulo: 'Agenda' },
  { href: '/painel/clientes', icone: Users, rotulo: 'Clientes' },
  { href: '/painel/financeiro', icone: DollarSign, rotulo: 'Financeiro' },
  { href: '/painel/estoque', icone: Package, rotulo: 'Estoque' },
  { href: '/painel/fila', icone: ListOrdered, rotulo: 'Fila de Espera' },
  { href: '/painel/relatorios', icone: BarChart3, rotulo: 'Relatórios' },
];

const itensTatuagem = [
  { href: '/painel/tatuagem/orcamentos', icone: FileText, rotulo: 'Orçamentos' },
  { href: '/painel/tatuagem/portfolio', icone: ImageIcon, rotulo: 'Portfólio' },
];

const itensRodape = [
  { href: '/painel/configuracoes', icone: Settings, rotulo: 'Configurações' },
  { href: '/painel/assinatura', icone: CreditCard, rotulo: 'Minha Assinatura' },
];

export function SidebarPainel() {
  const { tenant } = useTenant();
  const isTattoo = tenant?.segmento === 'tatuagem';

  return (
    <aside className="w-64 border-r border-zinc-200 bg-white h-screen flex-col sticky top-0 hidden md:flex">
      <div className="p-6 border-b border-zinc-100">
        <h2 className="font-bold text-xl tracking-tight text-zinc-900">
          Beleza<span className="text-violet-600">F3</span>
        </h2>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mt-1">Painel do Parceiro</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Principal</p>
          {itensBase.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm border border-violet-100'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                )
              }
            >
              <item.icone className="h-4 w-4" />
              {item.rotulo}
            </NavLink>
          ))}
        </div>

        {isTattoo && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Tattoo Studio</p>
            {itensTatuagem.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm border border-violet-100'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  )
                }
              >
                <item.icone className="h-4 w-4" />
                {item.rotulo}
              </NavLink>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Administração</p>
          {itensRodape.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm border border-violet-100'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                )
              }
            >
              <item.icone className="h-4 w-4" />
              {item.rotulo}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-zinc-100">
        <div className="bg-zinc-50 rounded-xl p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
            {tenant?.nome?.[0] || 'T'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{tenant?.nome}</p>
            <p className="text-[10px] text-zinc-500 truncate">{tenant?.segmento}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
