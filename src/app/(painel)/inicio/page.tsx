import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  TrendingUp, 
  CalendarCheck, 
  Wallet,
  Clock,
  Package,
  Plus,
  ArrowRight,
  TrendingDown,
  CalendarDays,
  CheckCircle2,
  XCircle,
  BarChart3,
  Search
} from 'lucide-react'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { useAgenda } from '@/hooks/useAgenda'
import { useFila } from '@/hooks/useFila'
import { CardKPI } from '@/componentes/ui/CardKPI'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PaginaInicio() {
  const { tenant, usuario } = useTenant()
  const { temPermissao } = usePermissao()
  const navigate = useNavigate()
  
  const agora = new Date()
  const saudacao = useMemo(() => {
    const hora = agora.getHours()
    if (hora < 12) return 'Bom dia'
    if (hora < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [agora])

  const eAdmin = temPermissao('PERM-003')
  const eRecepcionista = tenant?.segmento === 'barbearia' // Simplificação para o exemplo, pode ser refinado

  // 1. Métricas financeiras (Edge Function)
  const { data: metricas, isLoading: carregandoMetricas } = useQuery({
    queryKey: ['metricas-tenant', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('metricas-tenant')
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id && eAdmin,
    staleTime: 0 // NUNCA cachear dados financeiros
  })

  // 2. Agendamentos do dia (Query direta com RLS)
  const inicioDia = new Date(agora); inicioDia.setHours(0,0,0,0)
  const fimDia = new Date(agora); fimDia.setHours(23,59,59,999)
  const { agendamentos: agendamentosDia, carregando: carregandoAgenda } = useAgenda(inicioDia, fimDia)

  // 3. Fila de espera (Hook Realtime)
  const { fila } = useFila(tenant?.id, usuario?.unidadeId || undefined)

  // 4. Estoque baixo (Placeholder conforme solicitado)
  // Nota: A tabela produtos não existe no schema atual, mas o prompt pediu a query.
  // Vamos usar um estado simulado ou query se existir.
  const { data: estoqueBaixo } = useQuery({
    queryKey: ['estoque-baixo', tenant?.id],
    queryFn: async () => {
      // Como a tabela não existe ainda no banco real (conforme verificado via read_query),
      // retornaremos vazio para não quebrar a UI, mas com a estrutura pronta.
      return []
    },
    enabled: !!tenant?.id && eAdmin
  })

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {saudacao}, <span className="text-primary">{usuario?.nome?.split(' ')[0]}</span>!
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o que está acontecendo no <span className="font-semibold">{tenant?.nome}</span> hoje.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" className="rounded-full h-10" onClick={() => navigate('/painel/agenda')}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Ver Agenda
          </Button>
          <Button className="rounded-full h-10 bg-gradient-primary shadow-elegant" onClick={() => navigate('/painel/agenda')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>
      </header>

      {/* DASHBOARD ADMIN / DONO */}
      {eAdmin && (
        <div className="space-y-8">
          {/* KPIs Principais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CardKPI 
              titulo="Receita do Dia"
              valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metricas?.receita_dia || 0)}
              icone={<Wallet className="h-4 w-4" />}
              variacao={8.2} // Exemplo fixo conforme prompt
            />
            <CardKPI 
              titulo="Ticket Médio"
              valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metricas?.ticket_medio || 0)}
              icone={<TrendingUp className="h-4 w-4" />}
            />
            <CardKPI 
              titulo="Concluídos"
              valor={metricas?.agendamentos_concluidos || 0}
              icone={<CalendarCheck className="h-4 w-4" />}
            />
            <CardKPI 
              titulo="Comissões Pendentes"
              valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metricas?.comissoes_pendentes || 0)}
              icone={<TrendingDown className="h-4 w-4 text-destructive" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Gráfico de Receita */}
            <Card className="lg:col-span-2 rounded-2xl shadow-card border-none bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-8">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Receita dos últimos 7 dias
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/painel/relatorios')}>
                  Ver detalhes <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full flex items-end gap-2 px-2">
                  {metricas?.grafico_receita?.map((item: any, i: number) => {
                    const max = Math.max(...(metricas?.grafico_receita?.map((d: any) => d.total) || [1]))
                    const height = (item.total / max) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className="w-full bg-primary/20 hover:bg-primary rounded-t-lg transition-all duration-500 ease-out" 
                          style={{ height: `${height}%` }}
                          title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {format(new Date(item.data), 'EEE', { locale: ptBR })}
                        </span>
                      </div>
                    )
                  })}
                  {!metricas?.grafico_receita && (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground italic text-sm">
                      Nenhum dado disponível para o período.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alertas e Estoque */}
            <div className="space-y-6">
              <Card className="rounded-2xl shadow-card border-none bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Alertas do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(estoqueBaixo?.length || 0) > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                      <Package className="h-5 w-5 shrink-0" />
                      <div className="text-xs font-semibold">
                        {estoqueBaixo.length} produtos com estoque baixo
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <Clock className="h-5 w-5 shrink-0" />
                    <div className="text-xs font-semibold">
                      3 agendamentos não confirmados
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-info/10 text-info border border-info/20">
                    <Wallet className="h-5 w-5 shrink-0" />
                    <div className="text-xs font-semibold">
                      Contas a pagar vencendo amanhã
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-card border-none bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold">Próximos agendamentos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {agendamentosDia?.slice(0, 5).map((ag) => (
                      <div key={ag.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                            {ag.cliente_nome?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{ag.cliente_nome}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{ag.servico_nome}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">{ag.hora_inicio.slice(0, 5)}</p>
                          <p className="text-[10px] text-muted-foreground">Prof: {ag.profissional_nome}</p>
                        </div>
                      </div>
                    ))}
                    {(!agendamentosDia || agendamentosDia.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground italic text-sm">
                        Nenhum agendamento para hoje.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD PROFISSIONAL (Sem permissão PERM-003) */}
      {!eAdmin && !eRecepcionista && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CardKPI 
              titulo="Meus agendamentos hoje"
              valor={agendamentosDia?.filter(a => a.profissional_id === usuario?.id).length || 0}
              icone={<CalendarDays className="h-4 w-4" />}
            />
            <CardKPI 
              titulo="Confirmados"
              valor={agendamentosDia?.filter(a => a.profissional_id === usuario?.id && a.status === 'confirmado').length || 0}
              icone={<CheckCircle2 className="h-4 w-4 text-success" />}
            />
            <CardKPI 
              titulo="Atendidos"
              valor={agendamentosDia?.filter(a => a.profissional_id === usuario?.id && a.status === 'concluido').length || 0}
              icone={<CheckCircle2 className="h-4 w-4 text-primary" />}
            />
            <CardKPI 
              titulo="Cancelamentos/Faltas"
              valor={agendamentosDia?.filter(a => a.profissional_id === usuario?.id && (a.status === 'cancelado' || a.status === 'falta')).length || 0}
              icone={<XCircle className="h-4 w-4 text-destructive" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 rounded-2xl shadow-card border-none bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Minha Agenda do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agendamentosDia?.filter(a => a.profissional_id === usuario?.id).map((ag) => (
                    <div key={ag.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 transition-all group">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{ag.hora_inicio.slice(0, 5)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{ag.cliente_nome}</h4>
                        <p className="text-xs text-muted-foreground">{ag.servico_nome}</p>
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        ag.status === 'confirmado' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      )}>
                        {ag.status}
                      </div>
                    </div>
                  ))}
                  {agendamentosDia?.filter(a => a.profissional_id === usuario?.id).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      Você não tem agendamentos hoje.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit rounded-2xl shadow-card border-none bg-gradient-primary text-primary-foreground p-1">
              <CardContent className="p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80">Próximo Cliente</p>
                {(() => {
                  const proximo = agendamentosDia
                    ?.filter(a => a.profissional_id === usuario?.id && a.status !== 'concluido')
                    ?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0]
                  
                  if (!proximo) return <p className="mt-4 italic opacity-80">Nenhum próximo cliente</p>

                  return (
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold">{proximo.cliente_nome}</h3>
                        <p className="text-sm font-medium opacity-90">{proximo.servico_nome}</p>
                      </div>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Clock className="h-5 w-5" />
                        {proximo.hora_inicio.slice(0, 5)}
                      </div>
                      <Button variant="secondary" className="w-full font-bold rounded-xl" onClick={() => navigate('/painel/agenda')}>
                        Abrir Agenda
                      </Button>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* DASHBOARD RECEPCIONISTA (Segmento barbearia e sem permissão 003) */}
      {eRecepcionista && !eAdmin && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CardKPI 
              titulo="Na fila de espera"
              valor={fila.filter(f => f.status === 'aguardando').length || 0}
              icone={<Users className="h-4 w-4" />}
            />
            <CardKPI 
              titulo="Agendamentos hoje"
              valor={agendamentosDia?.length || 0}
              icone={<CalendarCheck className="h-4 w-4" />}
            />
            <CardKPI 
              titulo="Check-ins pendentes"
              valor={agendamentosDia?.filter(a => a.status === 'agendado').length || 0}
              icone={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 rounded-2xl shadow-card border-none bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold">Fila de Espera Atual</CardTitle>
                <Button className="rounded-full bg-primary" onClick={() => navigate('/painel/fila')}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar à fila
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fila.slice(0, 5).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                      <span className="text-lg font-black text-primary/30 w-6">{i + 1}º</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{item.clienteNome}</h4>
                        <p className="text-xs text-muted-foreground">{item.servicoNome || 'Serviço não informado'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {format(new Date(item.entradaEm), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {fila.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground italic">
                      Fila vazia no momento.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-card border-none bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold">Todos os agendamentos hoje</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {agendamentosDia?.slice(0, 8).map((ag) => (
                    <div key={ag.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{ag.cliente_nome}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{ag.hora_inicio.slice(0, 5)} • {ag.profissional_nome}</p>
                      </div>
                      <div className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                        ag.status === 'concluido' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      )}>
                        {ag.status}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
