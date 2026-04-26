// Super admin: gestão de tenants com busca, filtros, drawer lateral e impersonação.
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Search, Eye, LogIn, Ban, CheckCircle, RefreshCw,
  Building2, CalendarDays, CreditCard, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Plano {
  id:   string
  nome: string
}

interface Tenant {
  id:              string
  nome:            string
  segmento:        string | null
  status:          string
  plano:           string | null
  criado_em:       string
  agendamentos_mes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CORES_STATUS: Record<string, string> = {
  ativo:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  trial:      'bg-sky-500/20 text-sky-300 border-sky-500/30',
  suspenso:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  cancelado:  'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  bloqueado:  'bg-red-500/20 text-red-300 border-red-500/30',
}

function BadgeStatus({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      CORES_STATUS[status] ?? 'bg-zinc-800 text-zinc-400',
    )}>
      {status}
    </span>
  )
}

function fmt(data: string) {
  return new Date(data).toLocaleDateString('pt-BR')
}

// ── Componente principal ──────────────────────────────────────────────────────

const PaginaTenants = () => {
  const navigate   = useNavigate()
  const [tenants,  setTenants]  = useState<Tenant[]>([])
  const [planos,   setPlanos]   = useState<Plano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro,     setErro]     = useState<string | null>(null)

  // Filtros
  const [busca,    setBusca]    = useState('')
  const [filtroPlano,    setFiltroPlano]    = useState('todos')
  const [filtroSegmento, setFiltroSegmento] = useState('todos')
  const [filtroStatus,   setFiltroStatus]   = useState('todos')

  // Drawer lateral
  const [tenantSelecionado, setTenantSelecionado] = useState<Tenant | null>(null)
  const [drawerAberto,      setDrawerAberto]      = useState(false)

  // Estados de ação
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null)

  // ── Carregar dados ────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [{ data: tenantsRaw, error: errTenants }, { data: planosRaw, error: errPlanos }] =
        await Promise.all([
          supabase
            .from('tenants')
            .select('id, nome, segmento, status, plano, criado_em')
            .order('criado_em', { ascending: false }),
          supabase
            .from('planos')
            .select('id, nome')
            .order('preco')
        ])

      if (errTenants) {
        console.error('Erro ao buscar tenants:', errTenants)
        throw errTenants
      }
      if (errPlanos) {
        console.error('Erro ao buscar planos:', errPlanos)
        throw errPlanos
      }

      // Contar agendamentos do mês atual por tenant
      const inicio = new Date()
      inicio.setDate(1); inicio.setHours(0, 0, 0, 0)
      const { data: agendamentos, error: errAgend } = await supabase
        .from('agendamentos')
        .select('tenant_id')
        .gte('criado_em', inicio.toISOString())

      if (errAgend) {
        console.warn('Erro ao buscar agendamentos:', errAgend)
      }

      const contagem: Record<string, number> = {}
      for (const a of agendamentos ?? []) {
        contagem[a.tenant_id] = (contagem[a.tenant_id] ?? 0) + 1
      }

      const lista: Tenant[] = (tenantsRaw ?? []).map((t) => ({
        ...t,
        agendamentos_mes: contagem[t.id] ?? 0,
      }))

      setTenants(lista)
      setPlanos(planosRaw ?? [])
    } catch (e) {
      setErro(String(e))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── Filtros aplicados ─────────────────────────────────────────────────────

  const tenantsFiltrados = tenants.filter((t) => {
    if (busca && !t.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroStatus   !== 'todos' && t.status !== filtroStatus)            return false
    if (filtroSegmento !== 'todos' && t.segmento !== filtroSegmento)        return false
    if (filtroPlano    !== 'todos' && t.plano !== filtroPlano)           return false
    return true
  })

  const segmentosUnicos = [...new Set(tenants.map((t) => t.segmento).filter(Boolean))] as string[]

  // ── Ações ─────────────────────────────────────────────────────────────────

  async function alternarBloqueio(tenant: Tenant) {
    const novoStatus = tenant.status === 'bloqueado' ? 'ativo' : 'bloqueado'
    setAcaoEmAndamento(tenant.id)
    try {
      await (supabase
        .from('tenants' as never)
        .update({
          status:          novoStatus,
          bloqueado_em:    novoStatus === 'bloqueado' ? new Date().toISOString() : null,
          motivo_bloqueio: novoStatus === 'bloqueado' ? 'Bloqueado manualmente pelo super admin' : null,
        } as never)
        .eq('id', tenant.id)
      ) as unknown as Promise<unknown>

      await carregar()
      if (tenantSelecionado?.id === tenant.id) {
        setTenantSelecionado((prev) => prev ? { ...prev, status: novoStatus } : prev)
      }
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  async function mudarPlano(tenant: Tenant, novoPlanoNome: string) {
    setAcaoEmAndamento(tenant.id + '-plano')
    try {
      // O banco espera 'freemium' ou 'profissional' de acordo com o enum plano_tenant
      const planoParaBanco = novoPlanoNome.toLowerCase().includes('profissional') || novoPlanoNome.toLowerCase() === 'pro' 
        ? 'profissional' 
        : 'freemium'

      const { error } = await supabase
        .from('tenants')
        .update({ plano: planoParaBanco } as any)
        .eq('id', tenant.id)

      if (error) {
        console.error('Erro ao atualizar plano:', error)
        alert('Erro ao salvar plano: ' + error.message)
        return
      }

      await carregar()
      if (tenantSelecionado?.id === tenant.id) {
        setTenantSelecionado((prev) =>
          prev ? { ...prev, plano: planoParaBanco } : prev
        )
      }
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  async function impersonar(tenant: Tenant) {
    setAcaoEmAndamento(tenant.id + '-impersonar')
    try {
      // Salvar sessão atual do super admin
      const { data: sessaoAtual } = await supabase.auth.getSession()
      if (sessaoAtual.session) {
        sessionStorage.setItem('super_admin_session', JSON.stringify({
          access_token:  sessaoAtual.session.access_token,
          refresh_token: sessaoAtual.session.refresh_token,
        }))
      }

      // Solicitar token de impersonação
      const { data, error } = await supabase.functions.invoke('iniciar-impersonacao', {
        body: { tenant_id_alvo: tenant.id },
      })

      if (error || (data as { erro?: string })?.erro) {
        alert('Erro ao iniciar impersonação: ' + ((data as { erro?: string })?.erro ?? error?.message))
        return
      }

      const { token_hash, tenant_nome } = data as { token_hash: string; tenant_nome: string }

      // Marcar impersonação no sessionStorage
      sessionStorage.setItem('impersonando', JSON.stringify({ tenantNome: tenant_nome, tenantId: tenant.id }))

      // Trocar sessão
      const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
      if (otpErr) {
        sessionStorage.removeItem('impersonando')
        sessionStorage.removeItem('super_admin_session')
        alert('Erro ao trocar sessão: ' + otpErr.message)
        return
      }

      navigate('/painel')
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Tenants</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{tenants.length} cadastrados</p>
        </div>
        <button
          onClick={carregar}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Buscar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 bg-zinc-800 border-zinc-700"
              />
            </div>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
              <SelectTrigger className="w-44 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos segmentos</SelectItem>
                {segmentosUnicos.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroPlano} onValueChange={setFiltroPlano}>
              <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos planos</SelectItem>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Erro ao carregar tenants: {erro}</span>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="p-8 space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-12 bg-zinc-800 animate-pulse rounded" />
              ))}
            </div>
          ) : tenantsFiltrados.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              Nenhum tenant encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 font-medium">Segmento</th>
                    <th className="text-left px-4 py-3 font-medium">Plano</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Agend./mês</th>
                    <th className="text-left px-4 py-3 font-medium">Cadastro</th>
                    <th className="text-right px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantsFiltrados.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                      onClick={() => impersonar(t)}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-100 group-hover:text-violet-400 transition-colors">{t.nome}</td>
                      <td className="px-4 py-3 text-zinc-400">{t.segmento ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{t.plano ?? '—'}</td>
                      <td className="px-4 py-3"><BadgeStatus status={t.status} /></td>
                      <td className="px-4 py-3 text-right text-zinc-300">{t.agendamentos_mes}</td>
                      <td className="px-4 py-3 text-zinc-400">{fmt(t.criado_em)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100"
                            title="Ver detalhes"
                            onClick={() => { setTenantSelecionado(t); setDrawerAberto(true) }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-violet-400 hover:text-violet-200"
                            title="Impersonar"
                            disabled={acaoEmAndamento === t.id + '-impersonar'}
                            onClick={() => impersonar(t)}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              'h-7 w-7 p-0',
                              t.status === 'bloqueado'
                                ? 'text-emerald-400 hover:text-emerald-200'
                                : 'text-red-400 hover:text-red-200',
                            )}
                            title={t.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}
                            disabled={acaoEmAndamento === t.id}
                            onClick={() => alternarBloqueio(t)}
                          >
                            {t.status === 'bloqueado'
                              ? <CheckCircle className="h-3.5 w-3.5" />
                              : <Ban className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Drawer lateral de detalhes ─────────────────────────────────── */}
      <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
        <SheetContent className="w-96 bg-zinc-900 border-zinc-800 text-zinc-100 overflow-y-auto">
          {tenantSelecionado && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-zinc-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-violet-400" />
                  {tenantSelecionado.nome}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Informações gerais */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-medium">Detalhes</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-zinc-400">Status</span>
                    <BadgeStatus status={tenantSelecionado.status} />
                    <span className="text-zinc-400">Segmento</span>
                    <span>{tenantSelecionado.segmento ?? '—'}</span>
                    <span className="text-zinc-400">Cadastro</span>
                    <span>{fmt(tenantSelecionado.criado_em)}</span>
                    <span className="text-zinc-400 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Agend./mês
                    </span>
                    <span>{tenantSelecionado.agendamentos_mes}</span>
                  </div>
                </div>

                {/* Plano */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-medium flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Plano
                  </h3>
                  <Select
                    value={tenantSelecionado.plano ?? ''}
                    onValueChange={(v) => mudarPlano(tenantSelecionado, v)}
                    disabled={acaoEmAndamento === tenantSelecionado.id + '-plano'}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Sem plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {planos.map((p) => (
                        <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ações */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-medium">Ações</h3>
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                      disabled={acaoEmAndamento === tenantSelecionado.id + '-impersonar'}
                      onClick={() => { setDrawerAberto(false); impersonar(tenantSelecionado) }}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      {acaoEmAndamento === tenantSelecionado.id + '-impersonar'
                        ? 'Entrando...'
                        : 'Impersonar tenant'}
                    </Button>

                    <Button
                      variant="outline"
                      className={cn(
                        'w-full border-zinc-700',
                        tenantSelecionado.status === 'bloqueado'
                          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-950/20',
                      )}
                      disabled={acaoEmAndamento === tenantSelecionado.id}
                      onClick={() => alternarBloqueio(tenantSelecionado)}
                    >
                      {tenantSelecionado.status === 'bloqueado'
                        ? <><CheckCircle className="h-4 w-4 mr-2" /> Desbloquear tenant</>
                        : <><Ban className="h-4 w-4 mr-2" /> Bloquear tenant</>}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default PaginaTenants
