'use client'

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { 
  ArrowLeft, 
  Package, 
  History, 
  Calendar, 
  BadgeCheck, 
  AlertCircle,
  TrendingUp,
  LineChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PaginaDetalheProduto = () => {
  const { id } = useParams()
  const { tenant } = useTenant()
  const navigate = useNavigate()

  const { data: produto, isLoading } = useQuery({
    queryKey: ['produto-detalhe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          movimentacoes_estoque(*),
          lotes_estoque(*),
          produtos_por_servico(servico_id, servicos(nome))
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id && !!tenant?.id
  })

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-1" />
          <Skeleton className="h-64 col-span-2" />
        </div>
      </div>
    )
  }

  if (!produto) return null

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/painel/estoque')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{produto.nome}</h1>
          <p className="text-sm text-muted-foreground">{produto.categoria} • {produto.tipo}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Resumo */}
        <Card className="rounded-3xl border-none shadow-card overflow-hidden">
          <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
            {produto.foto_url ? (
              <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground/20" />
            )}
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Estoque Atual</span>
              <Badge variant={produto.estoque_atual <= produto.estoque_minimo ? 'destructive' : 'secondary'} className="rounded-full">
                {produto.estoque_atual} {produto.unidade_medida}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-primary">{formatarMoeda(produto.preco_venda)}</p>
              <p className="text-xs text-muted-foreground">Preço de venda sugerido</p>
            </div>
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo Médio:</span>
                <span className="font-semibold">{formatarMoeda(produto.custo_medio)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margem de Lucro:</span>
                <span className="font-semibold text-emerald-600">{produto.margem_lucro}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estoque Mínimo:</span>
                <span>{produto.estoque_minimo} {produto.unidade_medida}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico e Detalhes */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-none shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Movimentações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {produto.movimentacoes_estoque?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhuma movimentação registrada.</p>
                ) : (
                  produto.movimentacoes_estoque?.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).slice(0, 5).map((mov: any) => (
                    <div key={mov.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${mov.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {mov.tipo === 'entrada' ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(mov.criado_em), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                Vínculo com Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {produto.produtos_por_servico?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este produto não está vinculado a nenhum serviço.</p>
                ) : (
                  produto.produtos_por_servico?.map((item: any) => (
                    <Badge key={item.servico_id} variant="outline" className="px-3 py-1 rounded-full text-xs bg-primary/5 border-primary/20">
                      {item.servicos?.nome}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PaginaDetalheProduto
