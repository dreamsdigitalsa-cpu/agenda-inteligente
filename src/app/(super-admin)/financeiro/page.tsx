"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/cliente"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Plus, 
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { LancamentoFinanceiroAdmin, MetricasFinanceiras } from "@/tipos/financeiro"

export default function PaginaFinanceiroGlobal() {
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState<MetricasFinanceiras>({
    receitaTotal: 0,
    despesaTotal: 0,
    saldoTotal: 0,
    mrr: 0,
    churnRate: 0,
    tenantsAtivos: 0
  })
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiroAdmin[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [novoLancamento, setNovoLancamento] = useState<Partial<LancamentoFinanceiroAdmin>>({
    tipo: 'receita',
    status: 'pago',
    data_lancamento: format(new Date(), 'yyyy-MM-dd')
  })
  const { toast } = useToast()

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      
      const { data: dataLancamentos, error: errorLancamentos } = await supabase
        .from('lancamentos_financeiros_admin')
        .select('*')
        .order('data_lancamento', { ascending: false })

      if (errorLancamentos) throw errorLancamentos
      setLancamentos((dataLancamentos as any) || [])

      const { data: dataFaturas, error: errorFaturas } = await supabase
        .from('faturas')
        .select('valor, status')
        .eq('status', 'pago')

      if (errorFaturas) throw errorFaturas

      const { count: totalTenants, error: errorTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')

      if (errorTenants) throw errorTenants

      const receitaFaturas = dataFaturas?.reduce((acc, f) => acc + Number(f.valor), 0) || 0
      const receitaManuais = dataLancamentos?.filter(l => l.tipo === 'receita' && l.status === 'pago')
        .reduce((acc, l) => acc + Number(l.valor), 0) || 0
      const despesaManuais = dataLancamentos?.filter(l => l.tipo === 'despesa' && l.status === 'pago')
        .reduce((acc, l) => acc + Number(l.valor), 0) || 0

      setMetricas({
        receitaTotal: receitaFaturas + receitaManuais,
        despesaTotal: despesaManuais,
        saldoTotal: (receitaFaturas + receitaManuais) - despesaManuais,
        mrr: receitaFaturas,
        churnRate: 2.5,
        tenantsAtivos: totalTenants || 0
      })

    } catch (error: any) {
      console.error('Erro ao carregar dados financeiros:', error)
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  async function salvarLancamento() {
    try {
      if (!novoLancamento.valor || !novoLancamento.categoria) {
        toast({
          variant: "destructive",
          title: "Campos obrigatórios",
          description: "Preencha valor e categoria."
        })
        return
      }

      const { error } = await supabase
        .from('lancamentos_financeiros_admin')
        .insert([novoLancamento as any])

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Lançamento registrado com sucesso."
      })
      
      setIsDialogOpen(false)
      carregarDados()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      })
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Painel Financeiro Global</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
                <DialogDescription>
                  Adicione uma receita ou despesa manual ao fluxo do Super Admin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select 
                      value={novoLancamento.tipo} 
                      onValueChange={(v) => setNovoLancamento({...novoLancamento, tipo: v as any})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor</label>
                    <Input 
                      type="number" 
                      placeholder="0.00"
                      onChange={(e) => setNovoLancamento({...novoLancamento, valor: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
                  <Input 
                    placeholder="Ex: Marketing, Servidores, Assinatura"
                    onChange={(e) => setNovoLancamento({...novoLancamento, categoria: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <Input 
                    placeholder="Opcional"
                    onChange={(e) => setNovoLancamento({...novoLancamento, descricao: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <Input 
                    type="date"
                    value={novoLancamento.data_lancamento}
                    onChange={(e) => setNovoLancamento({...novoLancamento, data_lancamento: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={salvarLancamento}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(metricas.receitaTotal)}</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Operacional</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(metricas.despesaTotal)}</div>
            <p className="text-xs text-muted-foreground">Lançamentos manuais e custos fixos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR (Receita Recorrente)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(metricas.mrr)}</div>
            <p className="text-xs text-muted-foreground">Assinaturas ativas de tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.tenantsAtivos}</div>
            <p className="text-xs text-muted-foreground">Base de clientes atual</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Últimas Movimentações</CardTitle>
            <CardDescription>Fluxo de caixa consolidado do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento manual encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentos.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{format(new Date(l.data_lancamento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        <div className="font-medium">{l.categoria}</div>
                        <div className="text-xs text-muted-foreground">{l.descricao}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === 'receita' ? 'secondary' : 'destructive'}>
                          {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={l.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}>
                          {l.tipo === 'receita' ? '+' : '-'} {formatarMoeda(Number(l.valor))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Dados dos Tenants</CardTitle>
            <CardDescription>Resumo financeiro por cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Custo de Aquisição (CAC)</p>
                  <p className="text-sm text-muted-foreground">R$ 450,00 por tenant</p>
                </div>
                <div className="ml-auto font-medium text-emerald-600">Estável</div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Churn Rate</p>
                  <p className="text-sm text-muted-foreground">{metricas.churnRate}% mensal</p>
                </div>
                <div className="ml-auto font-medium text-red-600">+0.2%</div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Ticket Médio</p>
                  <p className="text-sm text-muted-foreground">{formatarMoeda(metricas.mrr / (metricas.tenantsAtivos || 1))}</p>
                </div>
                <div className="ml-auto font-medium">Crescente</div>
              </div>
            </div>
            <div className="mt-8">
               <Button variant="outline" className="w-full">Ver Relatório Detalhado</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
