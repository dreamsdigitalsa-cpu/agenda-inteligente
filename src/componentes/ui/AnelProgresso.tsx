// Anel de progresso SVG simples — usado no card de "Setup do perfil" da sidebar.
import { cn } from '@/lib/utils'

interface Props {
  valor: number // 0..100
  tamanho?: number
  espessura?: number
  className?: string
  children?: React.ReactNode
}

export function AnelProgresso({ valor, tamanho = 56, espessura = 5, className, children }: Props) {
  const v = Math.max(0, Math.min(100, valor))
  const raio = (tamanho - espessura) / 2
  const circ = 2 * Math.PI * raio
  const offset = circ - (v / 100) * circ

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke="hsl(var(--muted))"
          strokeWidth={espessura}
          fill="none"
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke="hsl(var(--success))"
          strokeWidth={espessura}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
        {children ?? `${Math.round(v)}%`}
      </div>
    </div>
  )
}
