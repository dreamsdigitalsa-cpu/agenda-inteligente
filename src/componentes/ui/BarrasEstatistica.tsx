// Card de estatística com barra horizontal (estilo "Customer reviews" da referência).
import { cn } from '@/lib/utils'

interface Item {
  rotulo: string
  valor: number
  total: number
  cor?: string // classe tailwind para a barra (default: bg-primary)
}

interface Props {
  itens: Item[]
  formatar?: (v: number, total: number) => string
  className?: string
}

export function BarrasEstatistica({ itens, formatar, className }: Props) {
  const fmt = formatar ?? ((v, t) => `${t === 0 ? 0 : Math.round((v / t) * 100)}%`)
  return (
    <div className={cn('space-y-3', className)}>
      {itens.map((it) => {
        const pct = it.total === 0 ? 0 : Math.round((it.valor / it.total) * 100)
        return (
          <div key={it.rotulo} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 truncate text-muted-foreground">{it.rotulo}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', it.cor ?? 'bg-primary')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
              {fmt(it.valor, it.total)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
