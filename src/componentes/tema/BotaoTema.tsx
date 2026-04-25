// Botão para alternar tema (claro / escuro / sistema).
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTema } from './ProvedorTema'
import { cn } from '@/lib/utils'

export function BotaoTema() {
  const { tema, temaResolvido, definirTema } = useTema()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-accent"
          aria-label="Alternar tema"
        >
          <Sun className={cn('h-4 w-4 transition-all', temaResolvido === 'escuro' && 'hidden')} />
          <Moon className={cn('h-4 w-4 transition-all', temaResolvido === 'claro' && 'hidden')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem onClick={() => definirTema('claro')} className={cn(tema === 'claro' && 'bg-accent text-accent-foreground')}>
          <Sun className="mr-2 h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => definirTema('escuro')} className={cn(tema === 'escuro' && 'bg-accent text-accent-foreground')}>
          <Moon className="mr-2 h-4 w-4" />
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => definirTema('sistema')} className={cn(tema === 'sistema' && 'bg-accent text-accent-foreground')}>
          <Monitor className="mr-2 h-4 w-4" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
