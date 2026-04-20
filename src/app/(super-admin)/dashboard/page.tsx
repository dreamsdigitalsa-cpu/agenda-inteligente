// Dashboard do super admin.
// Exibe métricas em tempo real via Edge Function metricas-super-admin (nunca exposta ao cliente).
// Gráficos: distribuição por segmento (pizza) e por plano (barras).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  Building2, TrendingUp, UserPlus, UserMinus,
  RefreshCw, AlertTriangle,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Metricas {
  tenants:      { total: number; ativos: number; suspensos: number; cancelados: number; bloqueados: number; em_trial: number }
  mrr_centavos: number
  novos:        { hoje: number; semana: number; mes: number }
  churn_mes:    number
  por_segmento: Array<{ segmento: string; total: number }>
  por_plano:    Array<{ plano: string; total: number }>
  top_tenants:  Array<{ id: string; nome: string; agendamentos_mes: number }>
  gerado_em:    string
}

// Cores para os gráficos (paleta violeta/zinc coerente com o dark theme)
const CORES = ['#7c3aed','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#6d28d9','#5b21b6']

function fmt(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

// ── Cartão de métrica simples ─────────────────────────────────────────────────

function CartaoMetrica({
  titulo, valor, subtitulo, icone: Icone, destaque,
}: {
  titulo: string; valor: string | number; subtitulo?: string
  icone: React.ElementType; destaque?: boolean
}) {
  return (
    <Card className={destaque ? 'border-violet-600/40 bg-violet-950/20' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
          <Icone className="h-4 w-4" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{valor}</p>
        {subtitulo && <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>}
      </CardContent>
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

const PaginaDashboard = () => {
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]             = useState<string | null>(null)

  async function buscarMetricas() {
    setCarregando(true)
    setErro(null)
    const { data, error } = await supabase.functions.invoke('metricas-super-admin')
    if (error || (data as { erro?: string })?.erro) {
      setErro((data as { erro?: string })?.erro ?? error?.message ?? 'Erro desconhecido')
    } else {
      setMetricas(data as Metricas)
    }
    setCarregando(false)
  }

  useEffect(() => { buscarMetricas() }, [])

  // ── Estados de carregamento e erro ────────────────────────────────────────

  if (carregando) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-zinc-800 animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-zinc-800 animate-pulse rounded-lg" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1,2].map((i) => <div key={i} className="h-64 bg-zinc-800 animate-pulse rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5" />
          <span>Erro ao carregar métricas: {erro}</span>
          <button onClick={buscarMetricas} className="ml-auto text-xs underline">Tentar novamente</button>
        </div>
      </div>
    )
  }

  if (!metricas) return null

  const m = metricas

  return (
    <div className="p-8 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Atualizado em {new Date(m.gerado_em).toLocaleString('pt-BR')}
          </p>
        </div>
        <button
          onClick={buscarMetricas}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {/* ── Métricas principais ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CartaoMetrica
          titulo="MRR"
          valor={fmt(m.mrr_centavos)}
          subtitulo="Receita mensal recorrente"
          icone={TrendingUp}
          destaque
        />
        <CartaoMetrica
          titulo="Tenants ativos"
          valor={m.tenants.ativos}
          subtitulo={`${m.tenants.total} total · ${m.tenants.em_trial} trial`}
          icone={Building2}
        />
        <CartaoMetrica
          titulo="Novos este mês"
          valor={m.novos.mes}
          subtitulo={`Semana: ${m.novos.semana} · Hoje: ${m.novos.hoje}`}
          icone={UserPlus}
        />
        <CartaoMetrica
          titulo="Churn do mês"
          valor={m.churn_mes}
          subtitulo={`${m.tenants.suspensos} susp. · ${m.tenants.bloqueados} bloq.`}
          icone={UserMinus}
        />
      </div>

      {/* ── Status badges ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Ativos',     count: m.tenants.ativos,     variant: 'default' as const  },
          { label: 'Trial',      count: m.tenants.em_trial,   variant: 'secondary' as const },
          { label: 'Suspensos',  count: m.tenants.suspensos,  variant: 'outline' as const  },
          { label: 'Cancelados', count: m.tenants.cancelados, variant: 'destructive' as const },
          { label: 'Bloqueados', count: m.tenants.bloqueados, variant: 'destructive' as const },
        ].map(({ label, count, variant }) => (
          <Badge key={label} variant={variant} className="text-xs px-3 py-1">
            {label}: {count}
          </Badge>
        ))}
      </div>

      {/* ── Gráficos ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição por segmento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">Por segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={m.por_segmento}
                  dataKey="total"
                  nameKey="segmento"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ segmento, percent }) =>
                    `${segmento} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {m.por_segmento.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} tenants`]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por plano */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-300">Por plano</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.por_plano} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="plano" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(v: number) => [`${v} tenants`]}
                />
                <Bar dataKey="total" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Top 10 tenants por agendamentos ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Top 10 tenants por agendamentos (mês atual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m.top_tenants.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum agendamento registrado este mês.</p>
          ) : (
            <div className="space-y-2">
              {m.top_tenants.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-zinc-500 text-right">{i + 1}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-violet-500 rounded-full"
                      style={{
                        width: `${(t.agendamentos_mes / (m.top_tenants[0]?.agendamentos_mes || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-zinc-300 w-48 truncate">{t.nome}</span>
                  <span className="text-sm font-medium text-zinc-100 w-12 text-right">
                    {t.agendamentos_mes}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaginaDashboard
