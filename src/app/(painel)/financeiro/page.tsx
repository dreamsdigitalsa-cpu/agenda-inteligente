// Painel: visão geral financeira (placeholder com layout estilizado).
import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Wallet, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CardKPI } from '@/componentes/ui/CardKPI'
import { BarrasEstatistica } from '@/componentes/ui/BarrasEstatistica'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const PaginaFinanceiro = () => {
  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Resumo do mês atual e principais indicadores.</p>
        </div>
        <Button className="rounded-full bg-gradient-primary px-5 font-semibold shadow-elegant hover:opacity-90">
          <Receipt className="mr-1.5 h-4 w-4" />
          Novo lançamento
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardKPI
          titulo="Receita total"
          valor="R$ 24.580"
          icone={<TrendingUp className="h-4 w-4" />}
          variacao={12.5}
          rodape="vs mês anterior"
          destaque
        />
        <CardKPI
          titulo="Despesas"
          valor="R$ 6.320"
          icone={<ArrowDownRight className="h-4 w-4" />}
          variacao={-3.2}
          rodape="vs mês anterior"
        />
        <CardKPI
          titulo="Lucro líquido"
          valor="R$ 18.260"
          icone={<Wallet className="h-4 w-4" />}
          variacao={18.7}
          rodape="vs mês anterior"
        />
        <CardKPI
          titulo="Ticket médio"
          valor="R$ 142"
          icone={<DollarSign className="h-4 w-4" />}
          variacao={4.1}
          rodape="por atendimento"
        />
      </div>

      {/* Detalhes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-border shadow-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição de receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <BarrasEstatistica
              itens={[
                { rotulo: 'Serviços', valor: 18420, total: 24580 },
                { rotulo: 'Produtos', valor: 4560, total: 24580, cor: 'bg-success' },
                { rotulo: 'Gorjetas', valor: 980, total: 24580, cor: 'bg-warning' },
                { rotulo: 'Outros', valor: 620, total: 24580, cor: 'bg-muted-foreground' },
              ]}
              formatar={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Últimos lançamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { nome: 'Maria Silva', tipo: 'Corte feminino', valor: '+ R$ 90', positivo: true },
              { nome: 'João Pedro', tipo: 'Barba completa', valor: '+ R$ 45', positivo: true },
              { nome: 'Fornecedor Beauty', tipo: 'Compra produtos', valor: '- R$ 320', positivo: false },
              { nome: 'Ana Costa', tipo: 'Coloração', valor: '+ R$ 220', positivo: true },
            ].map((l) => (
              <div key={l.nome + l.tipo} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                    {l.nome.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{l.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.tipo}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 text-sm font-bold tabular-nums ${l.positivo ? 'text-success' : 'text-destructive'}`}
                >
                  {l.positivo ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {l.valor}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PaginaFinanceiro
