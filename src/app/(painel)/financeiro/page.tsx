'use client'

import { 
  ArrowDownRight, 
  ArrowUpRight, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Receipt, 
  AlertCircle,
  Clock,
  LayoutDashboard,
  CalendarCheck,
  PlusCircle,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CardKPI } from '@/componentes/ui/CardKPI'
import { BarrasEstatistica } from '@/componentes/ui/BarrasEstatistica'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { usePermissao } from '@/hooks/usePermissao'
import { useTenant } from '@/hooks/useTenant'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const PaginaFinanceiro = () => {
  const { tenant } = useTenant()
  const { temPermissao } = usePermissao()
  const navigate = useNavigate()
  
  const temAcesso = temPermissao('PERM-003')

  const { data: metricas, isLoading } = useQuery({
    queryKey: ['metricas-tenant', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('metricas-tenant')
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id && temAcesso,
    staleTime: 0 // Dados financeiros sempre fresh
  })

  if (!temAcesso) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-6 text-destructive">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold">Acesso restrito</h2>
        <p className="max-w-md text-muted-foreground">
          Você não tem permissão para visualizar os dados financeiros. Entre em contato com o administrador se precisar de acesso.
        </p>
        <Button onClick={() => navigate('/painel/inicio')}>Voltar para o início</Button>
      </div>
    )
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <div className="space-y-6 p-6 md:p-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Resumo do mês atual e principais indicadores.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="rounded-full"
            onClick={() => navigate('/painel/financeiro/caixa')}
          >
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Caixa
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full"
            onClick={() => navigate('/painel/relatorios')}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Relatórios
          </Button>
          <Button 
            className="rounded-full bg-gradient-primary px-5 font-semibold shadow-elegant hover:opacity-90"
            onClick={() => navigate('/painel/financeiro/caixa')} // Redireciona para o caixa onde pode fazer lançamentos
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Novo lançamento
          </Button>
        </div>
      </header>

      {/* Alertas */}
      <div className="space-y-4">
        {metricas && !metricas.caixa_aberto_hoje && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Atenção</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>O caixa ainda não foi aberto hoje.</span>
              <Button size="sm" variant="outline" className="h-7 border-destructive/20 hover:bg-destructive/10" onClick={() => navigate('/painel/financeiro/caixa')}>
                Abrir agora
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {metricas && metricas.pendencias_categorizacao > 0 && (
          <Alert className="rounded-2xl border-amber-500/20 bg-amber-500/5 text-amber-600">
            <Clock className="h-4 w-4 text-amber-500" />
            <AlertTitle className="font-bold">Lançamentos Pendentes</AlertTitle>
            <AlertDescription>
              Existem {metricas.pendencias_categorizacao} lançamentos aguardando categorização.
            </AlertDescription>
          </Alert>
        )}

        {metricas && metricas.comissoes_mes > 0 && (
          <Alert className="rounded-2xl border-info/20 bg-info/5 text-info">
            <Wallet className="h-4 w-4 text-info" />
            <AlertTitle className="font-bold">Comissões</AlertTitle>
            <AlertDescription>
              Comissões a pagar este mês: <strong>{formatarMoeda(metricas.comissoes_mes)}</strong>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : (
          <>
            <CardKPI
              titulo="Receita do mês"
              valor={formatarMoeda(metricas?.receita_mes || 0)}
              icone={<TrendingUp className="h-4 w-4" />}
              variacao={metricas?.variacao_receita || 0}
              rodape="vs mês anterior"
              destaque
            />
            <CardKPI
              titulo="Despesas"
              valor={formatarMoeda(metricas?.despesa_mes || 0)}
              icone={<ArrowDownRight className="h-4 w-4" />}
              rodape="mês atual"
            />
            <CardKPI
              titulo="Lucro líquido"
              valor={formatarMoeda(metricas?.lucro_mes || 0)}
              icone={<Wallet className="h-4 w-4" />}
              rodape="mês atual"
            />
            <CardKPI
              titulo="Ticket médio"
              valor={formatarMoeda(metricas?.ticket_medio_mes || 0)}
              icone={<DollarSign className="h-4 w-4" />}
              rodape="por atendimento (mês)"
            />
          </>
        )}
      </div>

      {/* Gráficos e Detalhes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-none shadow-card lg:col-span-2 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Distribuição de despesas</CardTitle>
            <span className="text-xs text-muted-foreground uppercase font-semibold">Top 5 categorias</span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : metricas?.top_despesas?.length > 0 ? (
              <BarrasEstatistica
                itens={metricas.top_despesas.map((d: any) => ({
                  rotulo: d.categoria,
                  valor: d.valor,
                  total: metricas.despesa_mes,
                  cor: 'bg-destructive'
                }))}
                formatar={(v) => formatarMoeda(v)}
              />
            ) : (
              <div className="py-12 text-center text-muted-foreground italic">
                Nenhuma despesa registrada neste mês.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-card bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Próximas contas a vencer</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : metricas?.proximas_contas?.length > 0 ? (
              <div className="divide-y divide-border/50">
                {metricas.proximas_contas.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
                      <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.descricao || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground">Vence em {new Date(c.vencimento).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="text-sm font-bold text-destructive">
                      {formatarMoeda(c.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground italic text-sm">
                Nenhuma conta agendada para os próximos dias.
              </div>
            )}
            <div className="p-4 bg-muted/20 border-t border-border/50">
               <Button variant="ghost" size="sm" className="w-full text-xs font-bold" onClick={() => navigate('/painel/financeiro/lancamentos')}>
                 Ver todos os lançamentos
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder para a página de lançamentos se necessário */}
      <div id="financeiro-lancamentos-placeholder" />
    </div>
  )
}

export default PaginaFinanceiro
