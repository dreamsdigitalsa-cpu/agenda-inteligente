'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Package, AlertTriangle, ArrowRight, History, BarChart3, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'
import { ModalProduto } from '@/componentes/estoque/ModalProduto'
import { ModalMovimentacao } from '@/componentes/estoque/ModalMovimentacao'
import { AlertaValidade } from '@/componentes/estoque/AlertaValidade'

const PaginaEstoque = () => {
  const { tenant } = useTenant()
  const { temPermissao } = usePermissao()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'baixo' | 'vencendo'>('todos')
  const [modalNovo, setModalNovo] = useState(false)
  const [modalMovimentacao, setModalMovimentacao] = useState(false)

  const temAcesso = temPermissao('PERM-010')

  const { data: produtos, isLoading, refetch } = useQuery({
    queryKey: ['produtos', tenant?.id, busca, filtro],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true })

      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,codigo_barras.ilike.%${busca}%,codigo_interno.ilike.%${busca}%`)
      }

      if (filtro === 'baixo') {
        query = query.filter('estoque_atual', 'lte', 'estoque_minimo')
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id && temAcesso
  })

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (!temAcesso && !isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
        <Package className="h-16 w-16 text-muted-foreground/20" />
        <h2 className="mt-4 text-2xl font-bold">Acesso restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para gerenciar o estoque.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 md:p-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Estoque <span className="text-muted-foreground">({produtos?.length ?? 0})</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de produtos para venda e insumos para serviços.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="rounded-full"
            onClick={() => setModalMovimentacao(true)}
          >
            <History className="mr-1.5 h-4 w-4" />
            Entrada / Saída
          </Button>
          <Button 
            className="rounded-full bg-gradient-primary px-5 font-semibold shadow-elegant hover:opacity-90"
            onClick={() => setModalNovo(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo produto
          </Button>
        </div>
      </header>

      <AlertaValidade />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou código..." 
            className="h-10 rounded-full border-transparent bg-muted/60 pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filtro === 'todos' ? 'default' : 'outline'} 
            className="h-10 rounded-full"
            onClick={() => setFiltro('todos')}
          >
            Todos
          </Button>
          <Button 
            variant={filtro === 'baixo' ? 'destructive' : 'outline'} 
            className="h-10 rounded-full"
            onClick={() => setFiltro('baixo')}
          >
            Estoque baixo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex gap-4 p-4">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))
        ) : produtos?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-3xl border-muted">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">Comece adicionando produtos ao seu catálogo.</p>
          </div>
        ) : (
          produtos?.map((p) => (
            <Card 
              key={p.id} 
              className="group cursor-pointer overflow-hidden rounded-2xl border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
              onClick={() => navigate(`/painel/estoque/${p.id}`)}
            >
              <div className="flex gap-4 p-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{p.nome}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={p.estoque_atual <= (p.estoque_minimo || 0) ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                      {p.estoque_atual} {p.unidade_medida}
                    </Badge>
                    <span className="text-xs font-bold text-primary">{formatarMoeda(p.preco_venda || 0)}</span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {p.categoria || 'Sem categoria'} • {p.tipo}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
                <span>Custo Médio: {formatarMoeda(p.custo_medio || 0)}</span>
                <span className="font-medium text-emerald-600">Margem: {p.margem_lucro || 0}%</span>
              </div>
            </Card>
          ))
        )}
      </div>

      <ModalProduto 
        aberto={modalNovo} 
        onFechar={() => setModalNovo(false)} 
        onSucesso={() => {
          setModalNovo(false)
          refetch()
        }}
      />

      <ModalMovimentacao 
        aberto={modalMovimentacao} 
        onFechar={() => setModalMovimentacao(false)} 
        onSucesso={() => {
          setModalMovimentacao(false)
          refetch()
        }}
      />
    </div>
  )
}

export default PaginaEstoque
