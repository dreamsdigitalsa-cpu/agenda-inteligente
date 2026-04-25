// Card de KPI padronizado — usado em Financeiro, Relatórios.
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  titulo: string
  valor: ReactNode
  icone?: ReactNode
  variacao?: number | null // % vs período anterior
  rodape?: ReactNode
  destaque?: boolean // se true, aplica gradiente da marca
  className?: string
}

export function CardKPI({ titulo, valor, icone, variacao, rodape, destaque, className }: Props) {
  return (
    <Card
      className={cn(
        'rounded-2xl border shadow-card transition-all hover:shadow-elegant',
        destaque && 'border-transparent bg-gradient-primary text-primary-foreground',
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className={cn('text-xs font-medium uppercase tracking-wider', destaque ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
            {titulo}
          </p>
          {icone && (
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                destaque ? 'bg-white/20 text-primary-foreground' : 'bg-accent text-accent-foreground',
              )}
            >
              {icone}
            </span>
          )}
        </div>
        <p className={cn('mt-3 text-2xl font-bold tabular-nums', destaque ? 'text-primary-foreground' : 'text-foreground')}>
          {valor}
        </p>
        {variacao !== undefined && variacao !== null && (
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              variacao >= 0
                ? destaque ? 'bg-white/20 text-primary-foreground' : 'bg-success/15 text-success'
                : destaque ? 'bg-white/20 text-primary-foreground' : 'bg-destructive/15 text-destructive',
            )}
          >
            {variacao >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(variacao).toFixed(1)}%
          </div>
        )}
        {rodape && <div className={cn('mt-3 text-xs', destaque ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{rodape}</div>}
      </CardContent>
    </Card>
  )
}
