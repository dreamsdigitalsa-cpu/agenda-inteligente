// Painel: estoque de produtos (placeholder visual com layout final).
import { Plus, Package, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const PRODUTOS_DEMO = [
  { nome: 'Condicionador', preco: 'R$ 39,90', desc: 'Condicionador revitalizante para cabelos macios e com brilho.', cor: 'from-violet-100 to-violet-200' },
  { nome: 'Shampoo', preco: 'R$ 38,90', desc: 'Shampoo para limpeza profunda e cabelos manejáveis.', cor: 'from-emerald-100 to-emerald-200' },
  { nome: 'Óleo capilar', preco: 'R$ 34,90', desc: 'Nutre, fortalece, dá brilho e suaviza fios ressecados.', cor: 'from-amber-100 to-amber-200' },
  { nome: 'Gel para cabelo', preco: 'R$ 36,50', desc: 'Modela, define e mantém o estilo por mais tempo.', cor: 'from-lime-100 to-lime-200' },
  { nome: 'Batom', preco: 'R$ 26,50', desc: 'Cor vibrante, acabamento suave e longa duração.', cor: 'from-rose-100 to-rose-200' },
  { nome: 'Esmalte LA MER', preco: 'R$ 23,50', desc: 'Cores ousadas, acabamento brilhante e fórmula resistente.', cor: 'from-pink-100 to-pink-200' },
]

const PaginaEstoque = () => {
  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Lista de produtos <span className="text-muted-foreground">({PRODUTOS_DEMO.length})</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle seu estoque de produtos para venda e uso interno.
          </p>
        </div>
        <Button className="rounded-full bg-gradient-primary px-5 font-semibold shadow-elegant hover:opacity-90">
          <Plus className="mr-1.5 h-4 w-4" />
          Novo produto
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." className="h-10 rounded-full border-transparent bg-muted/60 pl-9" />
        </div>
        <Button variant="outline" className="h-10 rounded-full">
          <Filter className="mr-1.5 h-4 w-4" />
          Filtros
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUTOS_DEMO.map((p) => (
          <Card key={p.nome} className="group flex gap-4 rounded-2xl border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.cor}`}>
              <Package className="h-8 w-8 text-foreground/40" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{p.nome}</p>
                <span className="text-sm font-bold text-primary">{p.preco}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{p.desc}</p>
            </div>
          </Card>
        ))}

        <button className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground">
          <Plus className="h-6 w-6" />
          <span className="text-sm font-semibold">Adicionar novo</span>
        </button>
      </div>
    </div>
  )
}

export default PaginaEstoque
