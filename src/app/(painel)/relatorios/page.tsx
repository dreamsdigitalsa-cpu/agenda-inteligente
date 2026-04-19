// Página de Relatórios Financeiros
//
// Requer PERM-003 (VER_RELATORIOS_FINANCEIROS) para qualquer acesso.
// POLITICA_CACHE.DADOS_FINANCEIROS = -1 → nunca cachear, sempre buscar do servidor.
//
// Abas:
//   1. Resumo do período     — KPIs + gráfico de barras + comparativo
//   2. Por profissional      — tabela ordenável + pizza de participação
//   3. Por serviço           — ranking + tabela
//   4. Comissões             — gestão de pagamento de comissões (PERM-004)
//   5. Fluxo de caixa        — por categoria + gráfico de linha evolutivo
//
// Todos os dados são buscados diretamente via Supabase (RLS garante PERM-003).
// Escritas passam por Edge Functions.

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, XAxis, YAxis,
} from 'recharts'
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronUp,
  ChevronsUpDown, Download, Loader2, Lock, Minus,
  TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissao } from '@/hooks/usePermissao'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/lib/supabase/cliente'
import { PERMISSOES } from '@/lib/constantes/permissoes'
import { cn } from '@/lib/utils'

// ─── Tipos das tabelas financeiras (migração recente, não no tipos gerado ainda) ──

type DBLancamento = {
  id: string; tipo: 'receita' | 'despesa'; categoria: string
  descricao: string | null; valor: number; forma_pagamento: string
  agendamento_id: string | null; criado_em: string
}
type DBComissao = {
  id: string; profissional_id: string; tipo: 'percentual' | 'fixo'
  valor_base: number; percentual: number | null
  valor_calculado: number; status: string; periodo_referencia: string
}
type DBAgendamento   = { id: string; profissional_id: string; servico_id: string }
type DBProfissional  = { id: string; nome: string }
type DBServico       = { id: string; nome: string }

// ─── Tipos de domínio da UI ───────────────────────────────────────────────────

type AbaRelatorio     = 'resumo' | 'profissional' | 'servico' | 'comissoes' | 'fluxo'
type PeriodoPredefinido = 'semana' | 'mes_atual' | 'mes_passado' | 'personalizado'

interface PeriodoAtivo {
  tipo: PeriodoPredefinido
  custom?: { inicio: Date; fim: Date }
}

interface DadosDia { data: string; receita: number; despesa: number }

interface DadosResumo {
  receitaTotal: number; despesaTotal: number; lucro: number
  ticketMedio: number; totalAtendimentos: number
  receitaAnterior: number; despesaAnterior: number
  lucroAnterior: number
  porDia: DadosDia[]
}

interface DadosProfissional {
  profissionalId: string; nome: string
  atendimentos: number; receitaTotal: number; ticketMedio: number
}

interface DadosServico {
  servicoId: string; nome: string
  qtdRealizado: number; receitaTotal: number; percentualTotal: number
}

interface DadosComissaoUI {
  id: string; profissionalId: string; profissionalNome: string
  tipo: 'percentual' | 'fixo'; valorBase: number
  percentual: number | null; valorCalculado: number
  status: string; periodoReferencia: string
  marcandoPago: boolean // estado local de loading por linha
}

interface DadosFluxo {
  porCategoria: { categoria: string; receita: number; despesa: number }[]
  evolucao: { data: string; saldoAcumulado: number }[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPCOES_PERIODO: { value: PeriodoPredefinido; label: string }[] = [
  { value: 'semana',        label: 'Esta semana' },
  { value: 'mes_atual',     label: 'Este mês' },
  { value: 'mes_passado',   label: 'Mês passado' },
  { value: 'personalizado', label: 'Personalizado' },
]

// Paleta fixa para gráfico pizza de profissionais
const CORES_PIZZA = [
  '#2563eb', '#16a34a', '#dc2626', '#f59e0b',
  '#8b5cf6', '#ec4899', '#0891b2', '#65a30d',
]

// ─── Utilitários ─────────────────────────────────────────────────────────────

function fmt(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function fmtPct(atual: number, anterior: number): { texto: string; positivo: boolean | null } {
  if (anterior === 0) return { texto: '—', positivo: null }
  const v = ((atual - anterior) / anterior) * 100
  return { texto: `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, positivo: v >= 0 }
}

function labelCategoria(cat: string): string {
  const mapa: Record<string, string> = {
    servico: 'Serviço', produto: 'Produto', gorjeta: 'Gorjeta',
    fornecedor: 'Fornecedor', aluguel: 'Aluguel', salario: 'Salário',
    material: 'Material', manutencao: 'Manutenção', outros: 'Outros',
  }
  return mapa[cat] ?? cat
}

function calcularIntervalo(periodo: PeriodoAtivo): { inicio: Date; fim: Date } {
  const agora = new Date()
  const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59)

  if (periodo.tipo === 'semana') {
    const seg = new Date(agora)
    seg.setDate(agora.getDate() - ((agora.getDay() + 6) % 7))
    seg.setHours(0, 0, 0, 0)
    return { inicio: seg, fim: hoje }
  }
  if (periodo.tipo === 'mes_atual') {
    return { inicio: new Date(agora.getFullYear(), agora.getMonth(), 1), fim: hoje }
  }
  if (periodo.tipo === 'mes_passado') {
    return {
      inicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
      fim:    new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59),
    }
  }
  return periodo.custom ?? { inicio: new Date(agora.getFullYear(), agora.getMonth(), 1), fim: hoje }
}

// Período imediatamente anterior de mesma duração (para comparativo %)
function periodoAnterior(inicio: Date, fim: Date): { inicio: Date; fim: Date } {
  const dur = fim.getTime() - inicio.getTime()
  return {
    inicio: new Date(inicio.getTime() - dur - 1),
    fim:    new Date(inicio.getTime() - 1),
  }
}

function gerarMesesRecentes(n = 6): { value: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  })
}

// Exporta CSV com BOM para compatibilidade UTF-8 no Excel (ã, ç, etc.)
function exportarCSV<T extends Record<string, unknown>>(
  dados: T[],
  colunas: { chave: keyof T; titulo: string }[],
  arquivo: string,
) {
  const linhas = [
    colunas.map((c) => `"${c.titulo}"`).join(','),
    ...dados.map((row) =>
      colunas.map((c) => `"${String(row[c.chave] ?? '').replace(/"/g, '""')}"`).join(','),
    ),
  ]
  const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${arquivo}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function SkeletonCard() {
  return <div className="h-28 animate-pulse rounded-xl bg-muted" />
}

function SkeletonGrafico() {
  return <div className="h-56 animate-pulse rounded-lg bg-muted" />
}

function SkeletonTabela({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-2">
      <div className="h-9 animate-pulse rounded bg-muted" />
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded bg-muted/60" />
      ))}
    </div>
  )
}

// ─── Seletor de período ───────────────────────────────────────────────────────

interface PeriodoSelectorProps {
  periodo: PeriodoAtivo
  onChange: (p: PeriodoAtivo) => void
}

function PeriodoSelector({ periodo, onChange }: PeriodoSelectorProps) {
  const { inicio, fim } = calcularIntervalo(periodo)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPCOES_PERIODO.map((op) => (
        <Button
          key={op.value}
          size="sm"
          variant={periodo.tipo === op.value ? 'default' : 'outline'}
          onClick={() => onChange({ tipo: op.value })}
        >
          {op.label}
        </Button>
      ))}
      {periodo.tipo === 'personalizado' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={inicio.toISOString().slice(0, 10)}
            onChange={(e) =>
              onChange({
                tipo: 'personalizado',
                custom: { inicio: new Date(e.target.value + 'T00:00:00'), fim: periodo.custom?.fim ?? new Date() },
              })
            }
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={fim.toISOString().slice(0, 10)}
            onChange={(e) =>
              onChange({
                tipo: 'personalizado',
                custom: { inicio: periodo.custom?.inicio ?? new Date(), fim: new Date(e.target.value + 'T23:59:59') },
              })
            }
          />
        </div>
      )}
    </div>
  )
}

// ─── Aba 1: Resumo do período ─────────────────────────────────────────────────

interface AbaResumoProps { tenantId: string; inicio: Date; fim: Date }

function AbaResumo({ tenantId, inicio, fim }: AbaResumoProps) {
  const [dados, setDados] = useState<DadosResumo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setDados(null)

    async function buscar() {
      const { inicio: iniAnt, fim: fimAnt } = periodoAnterior(inicio, fim)

      // Busca atual e período anterior em paralelo — DADOS_FINANCEIROS = -1, sem cache
      const [resAtual, resAnterior] = await Promise.all([
        supabase
          .from('lancamentos' as never)
          .select('tipo, valor, agendamento_id, criado_em')
          .eq('tenant_id', tenantId)
          .gte('criado_em', inicio.toISOString())
          .lte('criado_em', fim.toISOString()) as unknown as
          Promise<{ data: Pick<DBLancamento, 'tipo' | 'valor' | 'agendamento_id' | 'criado_em'>[] | null }>,
        supabase
          .from('lancamentos' as never)
          .select('tipo, valor')
          .eq('tenant_id', tenantId)
          .gte('criado_em', iniAnt.toISOString())
          .lte('criado_em', fimAnt.toISOString()) as unknown as
          Promise<{ data: Pick<DBLancamento, 'tipo' | 'valor'>[] | null }>,
      ])

      if (cancelado) return

      const rows    = resAtual.data    ?? []
      const rowsAnt = resAnterior.data ?? []

      const receitaTotal = rows.filter((r) => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0)
      const despesaTotal = rows.filter((r) => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor), 0)
      const atendimentos = rows.filter((r) => r.tipo === 'receita' && r.agendamento_id).length

      const receitaAnterior = rowsAnt.filter((r) => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0)
      const despesaAnterior = rowsAnt.filter((r) => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor), 0)

      // Agrega por dia para o gráfico de barras
      const porDiaMap: Record<string, DadosDia> = {}
      rows.forEach((r) => {
        const dia = r.criado_em.slice(0, 10)
        if (!porDiaMap[dia]) porDiaMap[dia] = { data: dia, receita: 0, despesa: 0 }
        if (r.tipo === 'receita') porDiaMap[dia].receita += Number(r.valor)
        else porDiaMap[dia].despesa += Number(r.valor)
      })

      setDados({
        receitaTotal, despesaTotal,
        lucro: receitaTotal - despesaTotal,
        ticketMedio: atendimentos > 0 ? receitaTotal / atendimentos : 0,
        totalAtendimentos: atendimentos,
        receitaAnterior, despesaAnterior,
        lucroAnterior: receitaAnterior - despesaAnterior,
        porDia: Object.values(porDiaMap).sort((a, b) => a.data.localeCompare(b.data)),
      })
      setCarregando(false)
    }

    buscar()
    return () => { cancelado = true }
  }, [tenantId, inicio, fim])

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonGrafico />
      </div>
    )
  }
  if (!dados) return null

  const cfgGrafico: ChartConfig = {
    receita: { label: 'Receita', color: '#16a34a' },
    despesa: { label: 'Despesa', color: '#dc2626' },
  }

  const kpis = [
    {
      titulo: 'Receita total', valor: dados.receitaTotal, anterior: dados.receitaAnterior,
      cor: 'text-green-700', icone: <TrendingUp className="h-4 w-4" />,
    },
    {
      titulo: 'Despesas', valor: dados.despesaTotal, anterior: dados.despesaAnterior,
      cor: 'text-red-700', icone: <TrendingDown className="h-4 w-4" />,
    },
    {
      titulo: 'Lucro', valor: dados.lucro, anterior: dados.lucroAnterior,
      cor: dados.lucro >= 0 ? 'text-blue-700' : 'text-red-700',
      icone: <Wallet className="h-4 w-4" />,
    },
    {
      titulo: 'Ticket médio', valor: dados.ticketMedio, anterior: null,
      cor: 'text-foreground', icone: <Minus className="h-4 w-4" />,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Cards KPI com comparativo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => {
          const comp = k.anterior !== null ? fmtPct(k.valor, k.anterior) : null
          return (
            <Card key={k.titulo}>
              <CardContent className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{k.titulo}</p>
                  <span className={cn('text-muted-foreground', k.cor)}>{k.icone}</span>
                </div>
                <p className={cn('mt-1.5 text-xl font-semibold tabular-nums', k.cor)}>
                  {fmt(k.valor)}
                </p>
                {comp && (
                  <p className={cn(
                    'mt-0.5 flex items-center gap-0.5 text-xs',
                    comp.positivo === null
                      ? 'text-muted-foreground'
                      : comp.positivo ? 'text-green-600' : 'text-red-600',
                  )}>
                    {comp.positivo === true  && <ArrowUp   className="h-3 w-3" />}
                    {comp.positivo === false && <ArrowDown className="h-3 w-3" />}
                    {comp.texto} vs período anterior
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráfico de barras por dia */}
      {dados.porDia.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita e despesa por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cfgGrafico} className="h-56">
              <BarChart data={dados.porDia} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="data"
                  tickFormatter={(v: string) => v.slice(8)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v: number) => `R$${Math.round(v / 1000)}k`}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v: unknown) => fmt(Number(v))} />}
                />
                <Bar dataKey="receita" name="receita" fill="var(--color-receita)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="despesa" name="despesa" fill="var(--color-despesa)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento no período selecionado.
        </p>
      )}
    </div>
  )
}

// ─── Aba 2: Faturamento por profissional ──────────────────────────────────────

type CampoProfissional = keyof DadosProfissional
interface AbaProfissionalProps { tenantId: string; inicio: Date; fim: Date }

function AbaProfissional({ tenantId, inicio, fim }: AbaProfissionalProps) {
  const [dados, setDados]     = useState<DadosProfissional[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ord, setOrd] = useState<{ campo: CampoProfissional; dir: 'asc' | 'desc' }>({
    campo: 'receitaTotal', dir: 'desc',
  })

  useEffect(() => {
    let cancelado = false
    setCarregando(true)

    async function buscar() {
      // 1) Lancamentos de receita com agendamento no período
      const { data: lans } = await supabase
        .from('lancamentos' as never)
        .select('valor, agendamento_id')
        .eq('tenant_id', tenantId)
        .eq('tipo', 'receita')
        .not('agendamento_id', 'is', null)
        .gte('criado_em', inicio.toISOString())
        .lte('criado_em', fim.toISOString()) as unknown as
        { data: { valor: number; agendamento_id: string }[] | null }

      if (cancelado) return
      if (!lans?.length) { setDados([]); setCarregando(false); return }

      // 2) Agendamentos → profissional_id
      const agIds = [...new Set(lans.map((l) => l.agendamento_id))]
      const { data: ags } = await supabase
        .from('agendamentos')
        .select('id, profissional_id')
        .in('id', agIds) as unknown as { data: DBAgendamento[] | null }

      if (cancelado) return
      const agMap = Object.fromEntries((ags ?? []).map((a) => [a.id, a.profissional_id]))

      // 3) Nomes dos profissionais
      const profIds = [...new Set(Object.values(agMap).filter(Boolean))]
      const { data: profs } = await supabase
        .from('profissionais')
        .select('id, nome')
        .in('id', profIds) as unknown as { data: DBProfissional[] | null }

      if (cancelado) return
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]))

      // 4) Agrupa por profissional
      const agg: Record<string, { nome: string; receita: number; atendimentos: number }> = {}
      lans.forEach((l) => {
        const profId = agMap[l.agendamento_id]
        if (!profId) return
        if (!agg[profId]) agg[profId] = { nome: profMap[profId] ?? profId, receita: 0, atendimentos: 0 }
        agg[profId].receita += Number(l.valor)
        agg[profId].atendimentos++
      })

      setDados(
        Object.entries(agg).map(([id, v]) => ({
          profissionalId: id,
          nome: v.nome,
          atendimentos: v.atendimentos,
          receitaTotal: v.receita,
          ticketMedio: v.atendimentos > 0 ? v.receita / v.atendimentos : 0,
        })),
      )
      setCarregando(false)
    }

    buscar()
    return () => { cancelado = true }
  }, [tenantId, inicio, fim])

  const dadosOrdenados = useMemo(() => {
    return [...dados].sort((a, b) => {
      const va = a[ord.campo]
      const vb = b[ord.campo]
      if (typeof va === 'number' && typeof vb === 'number')
        return ord.dir === 'asc' ? va - vb : vb - va
      return ord.dir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
  }, [dados, ord])

  function alternarOrdem(campo: CampoProfissional) {
    setOrd((o) => ({ campo, dir: o.campo === campo && o.dir === 'desc' ? 'asc' : 'desc' }))
  }

  function IconeOrdem({ campo }: { campo: CampoProfissional }) {
    if (ord.campo !== campo) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    return ord.dir === 'asc'
      ? <ChevronUp   className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />
  }

  if (carregando) return <div className="space-y-4"><SkeletonTabela /><SkeletonGrafico /></div>

  if (!dados.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum atendimento com lançamento no período.
      </p>
    )
  }

  const totalGeral = dados.reduce((s, d) => s + d.receitaTotal, 0)
  const dadosPizza = dados.map((d) => ({ name: d.nome, value: d.receitaTotal }))
  const cfgPizza: ChartConfig = Object.fromEntries(
    dados.map((d, i) => [d.nome, { label: d.nome, color: CORES_PIZZA[i % CORES_PIZZA.length] }]),
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        {/* Tabela ordenável */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Por profissional</CardTitle>
              <Button
                size="sm" variant="outline"
                onClick={() =>
                  exportarCSV(
                    dadosOrdenados.map((d) => ({
                      Profissional: d.nome,
                      Atendimentos: String(d.atendimentos),
                      'Receita total': fmt(d.receitaTotal),
                      'Ticket médio': fmt(d.ticketMedio),
                    })),
                    [
                      { chave: 'Profissional', titulo: 'Profissional' },
                      { chave: 'Atendimentos', titulo: 'Atendimentos' },
                      { chave: 'Receita total', titulo: 'Receita total' },
                      { chave: 'Ticket médio', titulo: 'Ticket médio' },
                    ],
                    'faturamento_profissional',
                  )
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {([
                    { campo: 'nome' as CampoProfissional,         label: 'Profissional' },
                    { campo: 'atendimentos' as CampoProfissional,  label: 'Atend.' },
                    { campo: 'receitaTotal' as CampoProfissional,  label: 'Receita' },
                    { campo: 'ticketMedio' as CampoProfissional,   label: 'Ticket' },
                  ]).map((col) => (
                    <th
                      key={col.campo}
                      className="cursor-pointer select-none px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => alternarOrdem(col.campo)}
                    >
                      {col.label}
                      <IconeOrdem campo={col.campo} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosOrdenados.map((d) => (
                  <tr key={d.profissionalId} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{d.nome}</td>
                    <td className="px-4 py-2.5 tabular-nums">{d.atendimentos}</td>
                    <td className="px-4 py-2.5 tabular-nums text-green-700">{fmt(d.receitaTotal)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmt(d.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {dados.reduce((s, d) => s + d.atendimentos, 0)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-green-700">{fmt(totalGeral)}</td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Pizza de participação */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Participação no faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cfgPizza} className="h-56">
              <PieChart>
                <Pie
                  data={dadosPizza}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {dadosPizza.map((_, i) => (
                    <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v: unknown) => fmt(Number(v))} />}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Aba 3: Faturamento por serviço ──────────────────────────────────────────

interface AbaServicoProps { tenantId: string; inicio: Date; fim: Date }

function AbaServico({ tenantId, inicio, fim }: AbaServicoProps) {
  const [dados, setDados]           = useState<DadosServico[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)

    async function buscar() {
      const { data: lans } = await supabase
        .from('lancamentos' as never)
        .select('valor, agendamento_id')
        .eq('tenant_id', tenantId)
        .eq('tipo', 'receita')
        .not('agendamento_id', 'is', null)
        .gte('criado_em', inicio.toISOString())
        .lte('criado_em', fim.toISOString()) as unknown as
        { data: { valor: number; agendamento_id: string }[] | null }

      if (cancelado || !lans?.length) { setDados([]); setCarregando(false); return }

      const agIds = [...new Set(lans.map((l) => l.agendamento_id))]
      const { data: ags } = await supabase
        .from('agendamentos')
        .select('id, servico_id')
        .in('id', agIds) as unknown as { data: DBAgendamento[] | null }

      if (cancelado) return
      const agMap = Object.fromEntries((ags ?? []).map((a) => [a.id, a.servico_id]))

      const servIds = [...new Set(Object.values(agMap).filter(Boolean))]
      const { data: servs } = await supabase
        .from('servicos')
        .select('id, nome')
        .in('id', servIds) as unknown as { data: DBServico[] | null }

      if (cancelado) return
      const servMap = Object.fromEntries((servs ?? []).map((s) => [s.id, s.nome]))

      const agg: Record<string, { nome: string; receita: number; qty: number }> = {}
      lans.forEach((l) => {
        const sId = agMap[l.agendamento_id]
        if (!sId) return
        if (!agg[sId]) agg[sId] = { nome: servMap[sId] ?? sId, receita: 0, qty: 0 }
        agg[sId].receita += Number(l.valor)
        agg[sId].qty++
      })

      const total = Object.values(agg).reduce((s, v) => s + v.receita, 0)
      setDados(
        Object.entries(agg)
          .map(([id, v]) => ({
            servicoId: id,
            nome: v.nome,
            qtdRealizado: v.qty,
            receitaTotal: v.receita,
            percentualTotal: total > 0 ? (v.receita / total) * 100 : 0,
          }))
          .sort((a, b) => b.receitaTotal - a.receitaTotal),
      )
      setCarregando(false)
    }

    buscar()
    return () => { cancelado = true }
  }, [tenantId, inicio, fim])

  if (carregando) return <SkeletonTabela />

  if (!dados.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum serviço registrado no período.
      </p>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ranking de serviços</CardTitle>
          <Button
            size="sm" variant="outline"
            onClick={() =>
              exportarCSV(
                dados.map((d) => ({
                  Serviço: d.nome,
                  'Qtd. realizado': String(d.qtdRealizado),
                  'Receita total': fmt(d.receitaTotal),
                  '% do total': `${d.percentualTotal.toFixed(1)}%`,
                })),
                [
                  { chave: 'Serviço', titulo: 'Serviço' },
                  { chave: 'Qtd. realizado', titulo: 'Qtd.' },
                  { chave: 'Receita total', titulo: 'Receita total' },
                  { chave: '% do total', titulo: '% do total' },
                ],
                'faturamento_servico',
              )
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['#', 'Serviço', 'Qtd.', 'Receita', '% do total'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((d, i) => (
              <tr key={d.servicoId} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{d.nome}</td>
                <td className="px-4 py-2.5 tabular-nums">{d.qtdRealizado}</td>
                <td className="px-4 py-2.5 tabular-nums text-green-700">{fmt(d.receitaTotal)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(d.percentualTotal, 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-xs">{d.percentualTotal.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

// ─── Aba 4: Comissões ─────────────────────────────────────────────────────────

interface AbaComissoesProps {
  tenantId: string
  podePagar: boolean // requer PERM-004
}

function AbaComissoes({ tenantId, podePagar }: AbaComissoesProps) {
  const meses = useMemo(() => gerarMesesRecentes(6), [])
  const [periodoRef, setPeriodoRef] = useState(meses[0]?.value ?? '')
  const [dados, setDados]           = useState<DadosComissaoUI[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!periodoRef) return
    let cancelado = false
    setCarregando(true)

    async function buscar() {
      // Sem cache — DADOS_FINANCEIROS = -1
      const { data: comms } = await supabase
        .from('comissoes' as never)
        .select('id, profissional_id, tipo, valor_base, percentual, valor_calculado, status, periodo_referencia')
        .eq('tenant_id', tenantId)
        .eq('periodo_referencia', periodoRef)
        .order('profissional_id') as unknown as { data: DBComissao[] | null }

      if (cancelado || !comms?.length) { setDados([]); setCarregando(false); return }

      const profIds = [...new Set(comms.map((c) => c.profissional_id))]
      const { data: profs } = await supabase
        .from('profissionais')
        .select('id, nome')
        .in('id', profIds) as unknown as { data: DBProfissional[] | null }

      if (cancelado) return
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]))

      setDados(
        comms.map((c) => ({
          id: c.id,
          profissionalId: c.profissional_id,
          profissionalNome: profMap[c.profissional_id] ?? c.profissional_id,
          tipo: c.tipo,
          valorBase: Number(c.valor_base),
          percentual: c.percentual,
          valorCalculado: Number(c.valor_calculado),
          status: c.status,
          periodoReferencia: c.periodo_referencia,
          marcandoPago: false,
        })),
      )
      setCarregando(false)
    }

    buscar()
    return () => { cancelado = true }
  }, [tenantId, periodoRef])

  // Marca/reverte comissão — NUNCA atualizar direto no banco
  async function marcarPago(comissaoId: string, novoStatus: 'paga' | 'pendente') {
    setDados((prev) => prev.map((c) => c.id === comissaoId ? { ...c, marcandoPago: true } : c))
    try {
      const { data, error } = await supabase.functions.invoke('marcar-comissao-paga', {
        body: { tenant_id: tenantId, comissao_id: comissaoId, novo_status: novoStatus },
      })
      if (error) throw error
      if (data?.erro) {
        if (data.erro === 'sem_permissao') throw new Error('Sem permissão para esta ação')
        throw new Error(data.erro)
      }
      toast.success(novoStatus === 'paga' ? 'Comissão marcada como paga' : 'Status revertido')
      setDados((prev) =>
        prev.map((c) => c.id === comissaoId ? { ...c, status: novoStatus, marcandoPago: false } : c),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar comissão')
      console.error('[AbaComissoes]', e)
      setDados((prev) => prev.map((c) => c.id === comissaoId ? { ...c, marcandoPago: false } : c))
    }
  }

  const totalPendente = dados.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valorCalculado, 0)
  const totalPago     = dados.filter((c) => c.status === 'paga').reduce((s, c) => s + c.valorCalculado, 0)

  return (
    <div className="space-y-4">
      {/* Seletor de período de referência (mês) */}
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="periodo-ref">Período de referência</Label>
        <Select value={periodoRef} onValueChange={setPeriodoRef}>
          <SelectTrigger id="periodo-ref" className="w-52">
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {meses.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {carregando ? (
        <SkeletonTabela />
      ) : dados.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma comissão calculada para este período.
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-5">
                <div>
                  <p className="text-xs text-muted-foreground">A pagar (pendente)</p>
                  <p className="font-semibold text-amber-600">{fmt(totalPendente)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Já pago</p>
                  <p className="font-semibold text-green-600">{fmt(totalPago)}</p>
                </div>
              </div>
              <Button
                size="sm" variant="outline"
                onClick={() =>
                  exportarCSV(
                    dados.map((d) => ({
                      Profissional: d.profissionalNome,
                      Tipo: d.tipo,
                      'Valor base': fmt(d.valorBase),
                      Percentual: d.percentual != null ? `${d.percentual}%` : '—',
                      Comissão: fmt(d.valorCalculado),
                      Status: d.status,
                    })),
                    [
                      { chave: 'Profissional', titulo: 'Profissional' },
                      { chave: 'Tipo', titulo: 'Tipo' },
                      { chave: 'Valor base', titulo: 'Valor base' },
                      { chave: 'Percentual', titulo: 'Percentual' },
                      { chave: 'Comissão', titulo: 'Comissão' },
                      { chave: 'Status', titulo: 'Status' },
                    ],
                    'comissoes',
                  )
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Profissional', 'Tipo', 'Comissão', 'Status', ...(podePagar ? [''] : [])].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{c.profissionalNome}</td>
                    <td className="px-4 py-2.5 text-muted-foreground capitalize">
                      {c.tipo === 'percentual' ? `${c.percentual}% sobre valor` : 'Fixo'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold">{fmt(c.valorCalculado)}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          c.status === 'paga'     && 'border-green-200 bg-green-50 text-green-700',
                          c.status === 'pendente' && 'border-amber-200 bg-amber-50 text-amber-700',
                        )}
                      >
                        {c.status}
                      </Badge>
                    </td>
                    {podePagar && (
                      <td className="px-4 py-2.5">
                        {c.status === 'pendente' && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-green-700 hover:bg-green-50"
                            disabled={c.marcandoPago}
                            onClick={() => marcarPago(c.id, 'paga')}
                          >
                            {c.marcandoPago
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : 'Marcar como pago'}
                          </Button>
                        )}
                        {c.status === 'paga' && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            disabled={c.marcandoPago}
                            onClick={() => marcarPago(c.id, 'pendente')}
                          >
                            {c.marcandoPago ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reverter'}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Aba 5: Fluxo de caixa ────────────────────────────────────────────────────

interface AbaFluxoProps { tenantId: string; inicio: Date; fim: Date }

function AbaFluxo({ tenantId, inicio, fim }: AbaFluxoProps) {
  const [dados, setDados]           = useState<DadosFluxo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)

    async function buscar() {
      // Busca todos os lançamentos do período — sem cache (DADOS_FINANCEIROS = -1)
      const { data: lans } = await supabase
        .from('lancamentos' as never)
        .select('tipo, categoria, valor, criado_em')
        .eq('tenant_id', tenantId)
        .gte('criado_em', inicio.toISOString())
        .lte('criado_em', fim.toISOString())
        .order('criado_em', { ascending: true }) as unknown as
        { data: Pick<DBLancamento, 'tipo' | 'categoria' | 'valor' | 'criado_em'>[] | null }

      if (cancelado) return

      const rows = lans ?? []

      // Agrupa por categoria
      const catMap: Record<string, { receita: number; despesa: number }> = {}
      rows.forEach((r) => {
        if (!catMap[r.categoria]) catMap[r.categoria] = { receita: 0, despesa: 0 }
        if (r.tipo === 'receita') catMap[r.categoria].receita += Number(r.valor)
        else catMap[r.categoria].despesa += Number(r.valor)
      })

      // Evolução do saldo acumulado por dia
      const diaMap: Record<string, number> = {}
      rows.forEach((r) => {
        const dia = r.criado_em.slice(0, 10)
        if (diaMap[dia] == null) diaMap[dia] = 0
        diaMap[dia] += r.tipo === 'receita' ? Number(r.valor) : -Number(r.valor)
      })
      let acumulado = 0
      const evolucao = Object.entries(diaMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, delta]) => ({ data, saldoAcumulado: (acumulado += delta) }))

      setDados({
        porCategoria: Object.entries(catMap)
          .map(([cat, v]) => ({ categoria: cat, receita: v.receita, despesa: v.despesa }))
          .sort((a, b) => (b.receita + b.despesa) - (a.receita + a.despesa)),
        evolucao,
      })
      setCarregando(false)
    }

    buscar()
    return () => { cancelado = true }
  }, [tenantId, inicio, fim])

  if (carregando) return <div className="space-y-4"><SkeletonGrafico /><SkeletonTabela /></div>

  if (!dados || dados.porCategoria.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum lançamento no período.
      </p>
    )
  }

  const cfgLinha: ChartConfig = {
    saldoAcumulado: { label: 'Saldo acumulado', color: '#2563eb' },
  }

  return (
    <div className="space-y-5">
      {/* Gráfico de linha: evolução do saldo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução do saldo no período</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={cfgLinha} className="h-56">
            <LineChart data={dados.evolucao} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="data" tickFormatter={(v: string) => v.slice(8)} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => `R$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v: unknown) => fmt(Number(v))} />}
              />
              <Line
                type="monotone"
                dataKey="saldoAcumulado"
                name="saldoAcumulado"
                stroke="var(--color-saldoAcumulado)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tabela: entradas e saídas por categoria */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Por categoria</CardTitle>
            <Button
              size="sm" variant="outline"
              onClick={() =>
                exportarCSV(
                  dados.porCategoria.map((c) => ({
                    Categoria: labelCategoria(c.categoria),
                    Entradas: fmt(c.receita),
                    Saídas: fmt(c.despesa),
                    Saldo: fmt(c.receita - c.despesa),
                  })),
                  [
                    { chave: 'Categoria', titulo: 'Categoria' },
                    { chave: 'Entradas', titulo: 'Entradas' },
                    { chave: 'Saídas', titulo: 'Saídas' },
                    { chave: 'Saldo', titulo: 'Saldo' },
                  ],
                  'fluxo_caixa',
                )
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Categoria', 'Entradas', 'Saídas', 'Saldo'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.porCategoria.map((c) => {
                const saldo = c.receita - c.despesa
                return (
                  <tr key={c.categoria} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium capitalize">{labelCategoria(c.categoria)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-green-700">
                      {c.receita > 0 ? fmt(c.receita) : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-red-700">
                      {c.despesa > 0 ? fmt(c.despesa) : '—'}
                    </td>
                    <td className={cn(
                      'px-4 py-2.5 tabular-nums font-medium',
                      saldo >= 0 ? 'text-blue-700' : 'text-red-700',
                    )}>
                      {fmt(saldo)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PaginaRelatorios = () => {
  const { usuario }       = useTenant()
  const { temPermissao }  = usePermissao()

  const [aba, setAba]       = useState<AbaRelatorio>('resumo')
  const [periodo, setPeriodo] = useState<PeriodoAtivo>({ tipo: 'mes_atual' })

  const podeVer   = temPermissao(PERMISSOES.VER_RELATORIOS_FINANCEIROS)
  const podePagar = temPermissao(PERMISSOES.FECHAR_CAIXA)

  // Recalcula intervalo apenas quando período muda — evita re-renders nas abas
  const { inicio, fim } = useMemo(() => calcularIntervalo(periodo), [periodo])

  // Aguarda carregamento do usuário
  if (!usuario) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Guard: sem PERM-003
  if (!podeVer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Você não tem permissão para visualizar os relatórios financeiros.
          Solicite ao administrador.
        </p>
      </div>
    )
  }

  const tenantId = usuario.tenantId!

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Relatórios financeiros</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Dados sempre atualizados do servidor — sem cache.
        </p>
      </div>

      {/* Seletor de período (oculto na aba de comissões que tem seu próprio seletor) */}
      {aba !== 'comissoes' && (
        <PeriodoSelector periodo={periodo} onChange={setPeriodo} />
      )}

      {/* Abas */}
      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaRelatorio)}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="profissional">Profissionais</TabsTrigger>
          <TabsTrigger value="servico">Serviços</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-5">
          <AbaResumo tenantId={tenantId} inicio={inicio} fim={fim} />
        </TabsContent>

        <TabsContent value="profissional" className="mt-5">
          <AbaProfissional tenantId={tenantId} inicio={inicio} fim={fim} />
        </TabsContent>

        <TabsContent value="servico" className="mt-5">
          <AbaServico tenantId={tenantId} inicio={inicio} fim={fim} />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-5">
          <AbaComissoes tenantId={tenantId} podePagar={podePagar} />
        </TabsContent>

        <TabsContent value="fluxo" className="mt-5">
          <AbaFluxo tenantId={tenantId} inicio={inicio} fim={fim} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PaginaRelatorios
