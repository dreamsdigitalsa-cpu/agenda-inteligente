import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfissional } from '@/hooks/useProfissional'
import { supabase } from '@/lib/supabase/cliente'
import { CardKPI } from '@/componentes/ui/CardKPI'
import { DollarSign, TrendingUp, Clock, CheckCircle2, Download } from 'lucide-react'

/**
 * Interface para os itens de comissão
 * Representa um registro de ganho do profissional por serviço prestado
 */
interface ComissaoItem {
  id: string
  valor_base: number
  valor_calculado: number
  percentual: number | null
  tipo: 'percentual' | 'fixo'
  status: 'pendente' | 'aprovada' | 'paga' | 'cancelada'
  criado_em: string
  agendamento?: {
    cliente_nome: string
    servico_nome: string
  }
}

/**
 * Página de visualização de comissões para o perfil profissional.
 * Permite que o profissional logado acompanhe seus ganhos individuais.
 */
export default function MinhasComissoes() {
  const { profissional, carregando: profCarregando } = useProfissional()
  const [comissoes, setComissoes] = useState<ComissaoItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'paga'>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'mes_atual' | 'mes_anterior' | 'ultimos_3_meses' | 'tudo'>('mes_atual')

  useEffect(() => {
    // Aguarda o carregamento do perfil do profissional
    if (profCarregando) return
    
    // Se não houver profissional vinculado ao usuário, encerra o carregamento
    if (!profissional?.id) {
      setCarregando(false)
      return
    }

    const buscar = async () => {
      try {
        setCarregando(true)
        console.log('[minhas-comissoes] buscando dados para profissional:', profissional.id, { filtroPeriodo, filtroStatus })
        
        const hoje = new Date()
        let inicio: Date | null = null
        if (filtroPeriodo === 'mes_atual') inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        else if (filtroPeriodo === 'mes_anterior') inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        else if (filtroPeriodo === 'ultimos_3_meses') inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1)

        // Monta a query base
        let query = (supabase as any)
          .from('comissoes')
          .select(`
            id, valor_base, valor_calculado, percentual, tipo, status, criado_em,
            lancamento:lancamentos (
              agendamento:agendamentos (
                cliente:clientes (nome),
                servico:servicos (nome)
              )
            )
          `)
          .eq('profissional_id', profissional.id)
          .order('criado_em', { ascending: false })

        // Aplica filtros se necessário
        if (inicio) {
          query = query.gte('criado_em', inicio.toISOString())
          // Se for filtro de mês anterior, precisamos também limitar a data final
          if (filtroPeriodo === 'mes_anterior') {
            const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59)
            query = query.lte('criado_em', fimMesAnterior.toISOString())
          }
        }
        
        if (filtroStatus !== 'todos') {
          query = query.eq('status', filtroStatus)
        }

        const { data, error } = await query

        if (error) throw error

        // Mapeamento dos dados para a interface do componente
        const items: ComissaoItem[] = (data ?? []).map((row: any) => ({
          id: row.id,
          valor_base: Number(row.valor_base),
          valor_calculado: Number(row.valor_calculado),
          percentual: row.percentual ? Number(row.percentual) : null,
          tipo: row.tipo,
          status: row.status,
          criado_em: row.criado_em,
          agendamento: row.lancamento?.agendamento ? {
            cliente_nome: row.lancamento.agendamento.cliente?.nome ?? '—',
            servico_nome: row.lancamento.agendamento.servico?.nome ?? '—',
          } : undefined,
        }))

        setComissoes(items)
      } catch (e) {
        console.error('[minhas-comissoes] erro ao buscar comissões:', e)
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [profissional?.id, profCarregando, filtroPeriodo, filtroStatus])

  /**
   * Função para exportar os dados visíveis em CSV
   */
  const exportarCSV = () => {
    const header = 'Data,Cliente,Servico,Valor base,Tipo,Comissao,Status\n'
    const linhas = comissoes.map(c => [
      new Date(c.criado_em).toLocaleDateString('pt-BR'),
      c.agendamento?.cliente_nome ?? '—',
      c.agendamento?.servico_nome ?? '—',
      c.valor_base.toFixed(2),
      c.tipo === 'percentual' ? `${c.percentual}%` : 'fixo',
      c.valor_calculado.toFixed(2),
      c.status,
    ].join(',')).join('\n')
    const blob = new Blob([header + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comissoes-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Cálculo dos KPIs baseado nos dados carregados
   */
  const kpis = useMemo(() => {
    const hoje = new Date()
    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59)

    const pendenteMesAtual = comissoes
      .filter(c => c.status === 'pendente' && new Date(c.criado_em) >= inicioMesAtual)
      .reduce((s, c) => s + c.valor_calculado, 0)

    const pagaMesAtual = comissoes
      .filter(c => c.status === 'paga' && new Date(c.criado_em) >= inicioMesAtual)
      .reduce((s, c) => s + c.valor_calculado, 0)

    const totalMesAnterior = comissoes
      .filter(c => {
        const d = new Date(c.criado_em)
        return d >= inicioMesAnterior && d <= fimMesAnterior
      })
      .reduce((s, c) => s + c.valor_calculado, 0)

    const totalAtual = pendenteMesAtual + pagaMesAtual
    const variacao = totalMesAnterior > 0
      ? ((totalAtual - totalMesAnterior) / totalMesAnterior) * 100
      : 0

    return { pendenteMesAtual, pagaMesAtual, totalMesAnterior, variacao }
  }, [comissoes])

  // Estado de carregamento inicial do perfil
  if (profCarregando) return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  // Caso o usuário não tenha um perfil de profissional vinculado
  if (!profissional) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Você não está vinculado a um perfil de profissional para visualizar comissões.
      </div>
    )
  }

  // Função auxiliar para traduzir e colorir o badge de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'paga':
        return <Badge className="bg-green-600 hover:bg-green-700">Paga</Badge>
      case 'aprovada':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Aprovada</Badge>
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas comissões</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus ganhos por serviço realizado</p>
        </div>
        <Button variant="outline" onClick={exportarCSV} disabled={comissoes.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <CardKPI
          titulo="Pendente este mês"
          valor={`R$ ${kpis.pendenteMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icone={<Clock className="h-4 w-4" />}
        />
        <CardKPI
          titulo="Pago este mês"
          valor={`R$ ${kpis.pagaMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icone={<CheckCircle2 className="h-4 w-4" />}
        />
        <CardKPI
          titulo="Mês anterior"
          valor={`R$ ${kpis.totalMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icone={<DollarSign className="h-4 w-4" />}
        />
        <CardKPI
          titulo="Variação"
          valor={`${kpis.variacao >= 0 ? '+' : ''}${kpis.variacao.toFixed(1)}%`}
          icone={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3">
          <Select value={filtroPeriodo} onValueChange={(v: any) => setFiltroPeriodo(v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Mês atual</SelectItem>
              <SelectItem value="mes_anterior">Mês anterior</SelectItem>
              <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
              <SelectItem value="tudo">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="paga">Pagas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

        <CardHeader>
          <CardTitle className="text-base">
            {carregando ? 'Carregando...' : `${comissoes.length} comissão(ões) registrada(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : comissoes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma comissão encontrada no seu histórico.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Data</th>
                    <th className="text-left pb-2 font-medium">Cliente</th>
                    <th className="text-left pb-2 font-medium">Serviço</th>
                    <th className="text-right pb-2 font-medium">Valor</th>
                    <th className="text-center pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comissoes.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3">{c.agendamento?.cliente_nome ?? '—'}</td>
                      <td className="py-3">{c.agendamento?.servico_nome ?? '—'}</td>
                      <td className="py-3 text-right font-semibold text-primary">
                        R$ {c.valor_calculado.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td className="py-3 text-center">
                        {renderStatusBadge(c.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
