import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface CardPlanoProps {
  id: string
  nome: string
  preco: number
  descricao: string
  features: string[]
  selecionado?: boolean
  emUso?: boolean
  onSelecionar: (id: string) => void
}

export function CardPlano({ id, nome, preco, descricao, features, selecionado, emUso, onSelecionar }: CardPlanoProps) {
  return (
    <Card className={`relative flex flex-col h-full rounded-3xl transition-all duration-300 ${
      selecionado ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]' : 'hover:border-primary/50'
    }`}>
      {emUso && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-elegant">
          Plano Atual
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl font-bold">{nome}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-[40px]">{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">R$ {preco.toFixed(2).replace('.', ',')}</span>
          <span className="text-muted-foreground text-sm">/mês</span>
        </div>
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className={`w-full rounded-full font-semibold ${emUso ? 'bg-muted text-muted-foreground' : 'bg-gradient-primary'}`}
          disabled={emUso}
          onClick={() => onSelecionar(id)}
        >
          {emUso ? 'Plano Atual' : 'Selecionar'}
        </Button>
      </CardFooter>
    </Card>
  )
}
