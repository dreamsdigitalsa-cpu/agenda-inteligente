// Header global do painel autenticado.
// Inclui busca, notificações, alternador de tema e menu de perfil.
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Search, Settings as Cog, Sliders, User, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { supabase } from '@/lib/supabase/cliente'
import { iniciaisDoNome } from '@/lib/mascaras'
import { BotaoTema } from '@/componentes/tema/BotaoTema'

export function HeaderPainel() {
  const navigate = useNavigate()
  const { usuario } = useTenant()
  const { ehSuperAdmin } = usePermissao()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
      {/* Busca global */}
      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar no painel..."
          className="h-10 rounded-full border-transparent bg-muted/60 pl-9 pr-12 text-sm shadow-none focus-visible:bg-background focus-visible:ring-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-background"
          aria-label="Filtros"
        >
          <Sliders className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <BotaoTema />

        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-accent"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-primary p-0 px-1 text-[9px] font-bold text-primary-foreground">
            3
          </Badge>
        </Button>

        {/* Perfil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-2 flex items-center gap-3 rounded-full p-1 pr-3 transition-colors hover:bg-accent">
              <Avatar className="h-9 w-9 border-2 border-background shadow-card">
                <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {iniciaisDoNome(usuario?.nome ?? '') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <p className="text-xs font-semibold text-foreground">
                  {usuario?.nome ?? 'Usuário'}
                </p>
                <p className="text-[10px] text-muted-foreground">Ver perfil</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="text-xs">
              {usuario?.email ?? '—'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ehSuperAdmin && (
              <>
                <DropdownMenuItem onClick={() => navigate('/super-admin/dashboard')}>
                  <ShieldCheck className="mr-2 h-4 w-4 text-violet-500" />
                  Painel Admin
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => navigate('/painel/configuracoes')}>
              <User className="mr-2 h-4 w-4" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/painel/configuracoes')}>
              <Cog className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={sair} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
