// Super admin: gestão de planos de assinatura (CRUD + feature flags + atribuição em massa).
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, RefreshCw, AlertTriangle, CreditCard } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Features {
  agendamento_online:   boolean
  relatorios_basicos:   boolean
  relatorios_avancados: boolean
  ligacao_ia:           boolean
  multilojas:           boolean
  api_acesso:           boolean
}

interface Plano {
  id:                    string
  nome:                  string
  slug?:                 string // Slug não existe na tabela planos, vou usar o nome ou ID
  preco:                 number
  limites:               Record<string, number | null>
  features:              string[]
  ativo:                 boolean
  tenants_count?:        number
}

const FEATURES_LABELS: Array<{ key: keyof Features; label: string }> = [
  { key: 'agendamento_online',   label: 'Agendamento online'     },
  { key: 'relatorios_basicos',   label: 'Relatórios básicos'     },
  { key: 'relatorios_avancados', label: 'Relatórios avançados'   },
  { key: 'ligacao_ia',           label: 'Ligação IA'             },
  { key: 'multilojas',           label: 'Multi-unidades'         },
  { key: 'api_acesso',           label: 'Acesso à API'           },
]

const FEATURES_PADRAO: Features = {
  agendamento_online:   true,
  relatorios_basicos:   true,
  relatorios_avancados: false,
  ligacao_ia:           false,
  multilojas:           false,
  api_acesso:           false,
}

function fmtPreco(valor: number) {
  if (valor === 0) return 'Grátis'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

// ── Modal de criação/edição ───────────────────────────────────────────────────

interface ModalPlanoProps {
  plano:     Plano | null
  aberto:    boolean
  onFechar:  () => void
  onSalvar:  () => void
}

function ModalPlano({ plano, aberto, onFechar, onSalvar }: ModalPlanoProps) {
  const editando = !!plano

  const [nome,     setNome]     = useState('')
  // const [slug,     setSlug]     = useState('') // Tabela planos não tem slug
  const [preco,    setPreco]    = useState('')
  const [maxAg,    setMaxAg]    = useState('')
  const [maxProf,  setMaxProf]  = useState('')
  const [maxUnit,  setMaxUnit]  = useState('')
  const [features, setFeatures] = useState<Features>({ ...FEATURES_PADRAO })
  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)

  useEffect(() => {
    if (aberto) {
      setNome(plano?.nome ?? '')
      // setSlug(plano?.slug ?? '')
      setPreco(plano ? String(plano.preco) : '')
      setMaxAg(plano?.limites?.max_agendamentos_mes != null ? String(plano.limites.max_agendamentos_mes) : '')
      setMaxProf(plano?.limites?.max_profissionais != null ? String(plano.limites.max_profissionais) : '')
      setMaxUnit(plano?.limites?.max_unidades != null ? String(plano.limites.max_unidades) : '')
      // No banco features é string[], no front é Record<string, boolean>
      const featuresMap: Features = { ...FEATURES_PADRAO }
      if (plano?.features) {
        plano.features.forEach(f => {
          if (f in featuresMap) featuresMap[f as keyof Features] = true
        })
      }
      setFeatures(featuresMap)
      setErro(null)
    }
  }, [aberto, plano])

  function gerarSlug(n: string) {
    return n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
      return
    }
    const precoFinal = parseFloat(preco || '0')
    setSalvando(true)
    setErro(null)
    try {
      const selectedFeatures = Object.entries(features)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key)

      const payload = {
        nome:                  nome.trim(),
        preco:                 precoFinal,
        limites: {
          max_agendamentos_mes:  maxAg   ? parseInt(maxAg)   : null,
          max_profissionais:     maxProf ? parseInt(maxProf) : null,
          max_unidades:          maxUnit ? parseInt(maxUnit) : null,
        },
        features: selectedFeatures,
      }

      if (editando && plano) {
        const { error } = await (supabase
          .from('planos' as never)
          .update(payload as never)
          .eq('id', plano.id)
        ) as unknown as { error: unknown }
        if (error) throw new Error(String(error))
      } else {
        const { error } = await (supabase
          .from('planos' as never)
          .insert(payload as never)
        ) as unknown as { error: unknown }
        if (error) throw new Error(String(error))
      }
      onSalvar()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) onFechar() }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar plano' : 'Novo plano'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {erro && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Nome</Label>
              <Input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                }}
                className="bg-zinc-800 border-zinc-700 col-span-2"
                placeholder="Ex: Profissional"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Preço mensal (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              placeholder="0.00 = Grátis"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Máx. agend./mês',     value: maxAg,   set: setMaxAg   },
              { label: 'Máx. profissionais',   value: maxProf, set: setMaxProf },
              { label: 'Máx. unidades',        value: maxUnit, set: setMaxUnit },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">{label}</Label>
                <Input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="Ilimitado"
                />
              </div>
            ))}
          </div>

          {/* Feature flags */}
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Funcionalidades</Label>
            <div className="grid grid-cols-2 gap-2">
              {FEATURES_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <Switch
                    checked={features[key]}
                    onCheckedChange={(v) => setFeatures((prev) => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} className="border-zinc-700 text-zinc-300">
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="bg-violet-600 hover:bg-violet-700">
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

const PaginaPlanos = () => {
  const [planos,     setPlanos]     = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro,       setErro]       = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const { data, error } = (await supabase
        .from('planos' as never)
        .select('*')
        .order('preco')
      ) as unknown as { data: Plano[] | null; error: unknown }
      if (error) throw new Error(String(error))

      // Contar tenants por plano
      const { data: tenantsData } = (await supabase
        .from('tenants' as never)
        .select('plano')
        .neq('status', 'cancelado')
      ) as unknown as { data: { plano: string | null }[] | null }

      const contagem: Record<string, number> = {}
      for (const t of tenantsData ?? []) {
        if (t.plano) contagem[t.plano] = (contagem[t.plano] ?? 0) + 1
      }

      setPlanos((data ?? []).map((p) => ({ ...p, tenants_count: contagem[p.nome] ?? 0 })))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() {
    setPlanoEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(plano: Plano) {
    setPlanoEditando(plano)
    setModalAberto(true)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Planos</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{planos.length} planos cadastrados</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={carregar}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
          <Button onClick={abrirNovo} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-2" /> Novo plano
          </Button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Erro: {erro}</span>
        </div>
      )}

      {/* Grid de planos */}
      {carregando ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-64 bg-zinc-800 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {planos.map((plano) => (
            <Card key={plano.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-violet-400" />
                    {plano.nome}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100"
                    onClick={() => abrirEdicao(plano)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-2xl font-bold text-violet-300">{fmtPreco(plano.preco)}</p>
                {/* <p className="text-xs text-zinc-500 font-mono">{plano.slug}</p> */}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Limites */}
                <div className="space-y-1 text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>Agend./mês</span>
                    <span className="text-zinc-300">
                      {plano.limites?.max_agendamentos_mes ?? '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profissionais</span>
                    <span className="text-zinc-300">{plano.limites?.max_profissionais ?? '∞'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unidades</span>
                    <span className="text-zinc-300">{plano.limites?.max_unidades ?? '∞'}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="border-t border-zinc-800 pt-3 space-y-1">
                  {FEATURES_LABELS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={plano.features?.includes(key) ? 'text-emerald-400' : 'text-zinc-600'}>
                        {plano.features?.includes(key) ? '✓' : '✗'}
                      </span>
                      <span className={plano.features?.includes(key) ? 'text-zinc-300' : 'text-zinc-600'}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tenants neste plano */}
                <div className="border-t border-zinc-800 pt-2 text-xs text-zinc-500 text-right">
                  {plano.tenants_count} tenant{plano.tenants_count !== 1 ? 's' : ''} ativos
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <ModalPlano
        plano={planoEditando}
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={carregar}
      />
    </div>
  )
}

export default PaginaPlanos
