// Configuração de ligação IA por tenant.
// Permite ao admin ativar/desativar ligações automáticas para o seu estabelecimento,
// definir quantas horas antes ligar, configurar o telefone de transferência
// e visualizar o histórico de ligações com resultado e custo estimado.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Phone, Clock, History, Save, AlertTriangle, Info } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ConfigTenant {
  ativo:                   boolean
  horas_antecedencia:      number
  telefone_estabelecimento: string
}

interface LigacaoHistorico {
  id:               string
  status:           string
  resultado:        string | null
  dtmf:             string | null
  duracao_segundos: number | null
  custo_centavos:   number | null
  erro:             string | null
  criado_em:        string
}

// ── Constantes informativas ───────────────────────────────────────────────────

// Custo estimado por ligação (ElevenLabs ~R$0,30 + Twilio ~R$0,08 = ~R$0,38)
const CUSTO_ESTIMADO_REAIS = 0.38

const LABELS_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  iniciando:    { label: 'Iniciando',     variant: 'secondary'   },
  em_andamento: { label: 'Em andamento',  variant: 'secondary'   },
  concluida:    { label: 'Concluída',     variant: 'default'     },
  sem_resposta: { label: 'Sem resposta',  variant: 'outline'     },
  falhou:       { label: 'Falhou',        variant: 'destructive' },
}

const LABELS_RESULTADO: Record<string, string> = {
  confirmado:   '✅ Confirmado',
  cancelado:    '❌ Cancelado',
  transferido:  '↗ Transferido',
  sem_resposta: '— Sem resposta',
}

const LABELS_DTMF: Record<string, string> = {
  '1': 'Confirmou (1)',
  '2': 'Cancelou (2)',
  '3': 'Transferiu (3)',
}

// ── Página principal ──────────────────────────────────────────────────────────

const PaginaConfiguracaoLigacaoIA = () => {
  const { tenant } = useTenant()
  const { ehAdmin } = usePermissao()

  const [globalAtivo, setGlobalAtivo]   = useState<boolean | null>(null) // null = carregando
  const [config, setConfig]             = useState<ConfigTenant>({
    ativo:                   false,
    horas_antecedencia:      24,
    telefone_estabelecimento: '',
  })
  const [historico, setHistorico]       = useState<LigacaoHistorico[]>([])
  const [carregando, setCarregando]     = useState(true)
  const [salvando, setSalvando]         = useState(false)

  // ── Carregamento inicial ────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    if (!tenant?.id) return
    setCarregando(true)

    const [{ data: globalRow }, { data: cfgRow }, { data: histRows }] = await Promise.all([
      // Toggle global (legível por qualquer autenticado — chave sem 'credenciais')
      (supabase
        .from('configuracoes_sistema' as never)
        .select('valor')
        .eq('chave', 'ligacao_ia_config')
        .maybeSingle()
      ) as unknown as Promise<{ data: { valor: { ativo: boolean } } | null }>,

      // Config do tenant
      (supabase
        .from('configuracoes_ligacao_ia' as never)
        .select('ativo, horas_antecedencia, telefone_estabelecimento')
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      ) as unknown as Promise<{ data: ConfigTenant | null }>,

      // Histórico de ligações — últimas 25
      (supabase
        .from('ligacoes_ia' as never)
        .select('id, status, resultado, dtmf, duracao_segundos, custo_centavos, erro, criado_em')
        .eq('tenant_id', tenant.id)
        .order('criado_em', { ascending: false })
        .limit(25)
      ) as unknown as Promise<{ data: LigacaoHistorico[] | null }>,
    ])

    setGlobalAtivo(globalRow?.valor?.ativo ?? false)
    if (cfgRow) {
      setConfig({
        ativo:                   cfgRow.ativo,
        horas_antecedencia:      cfgRow.horas_antecedencia,
        telefone_estabelecimento: cfgRow.telefone_estabelecimento ?? '',
      })
    }
    setHistorico(histRows ?? [])
    setCarregando(false)
  }, [tenant?.id])

  useEffect(() => { carregar() }, [carregar])

  // ── Salvar configurações do tenant ──────────────────────────────────────────

  async function salvar() {
    if (!tenant?.id || !ehAdmin) return

    const horasNum = Number(config.horas_antecedencia)
    if (isNaN(horasNum) || horasNum < 1 || horasNum > 48) {
      toast.error('Horas de antecedência deve ser entre 1 e 48')
      return
    }

    setSalvando(true)

    const payload = {
      tenant_id:                tenant.id,
      ativo:                    config.ativo,
      horas_antecedencia:       horasNum,
      telefone_estabelecimento: config.telefone_estabelecimento.replace(/\D/g, '') || null,
    }

    const { error } = await (supabase
      .from('configuracoes_ligacao_ia' as never)
      // @ts-expect-error tabela nova não está nos tipos gerados
      .upsert(payload, { onConflict: 'tenant_id' })
    )

    setSalvando(false)
    error ? toast.error('Erro ao salvar') : toast.success('Configurações salvas')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-36 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-2xl">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Phone className="h-6 w-6" />
          Ligação IA — Confirmação automática
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ligue automaticamente para os clientes para confirmar agendamentos usando voz gerada por IA.
        </p>
      </header>

      {/* Aviso se feature global estiver desativada */}
      {globalAtivo === false && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              A feature de ligação IA está desativada globalmente pelo super admin.
              Entre em contato com o suporte para habilitar.
            </p>
          </CardContent>
        </Card>
      )}

      {!ehAdmin && (
        <Card>
          <CardContent className="p-4 text-muted-foreground text-sm">
            Apenas administradores podem alterar estas configurações.
          </CardContent>
        </Card>
      )}

      {/* ── Ativação e antecedência ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Configuração de ligação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle do tenant */}
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <Label htmlFor="tenant_ativo" className="font-medium cursor-pointer">
                Ativar ligação IA para meu estabelecimento
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando ativo, admins podem iniciar ligações de confirmação manualmente.
              </p>
            </div>
            <Switch
              id="tenant_ativo"
              checked={config.ativo}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, ativo: v }))}
              disabled={!ehAdmin || globalAtivo === false}
            />
          </div>

          {/* Horas de antecedência */}
          <div className="space-y-1">
            <Label htmlFor="horas">Horas de antecedência para ligar</Label>
            <div className="flex items-center gap-3">
              <Input
                id="horas"
                type="number"
                min={1}
                max={48}
                value={config.horas_antecedencia}
                onChange={(e) => setConfig((c) => ({ ...c, horas_antecedencia: parseInt(e.target.value) || 24 }))}
                className="w-24"
                disabled={!ehAdmin}
              />
              <span className="text-sm text-muted-foreground">
                horas antes do atendimento
              </span>
            </div>
          </div>

          {/* Telefone do estabelecimento (para transferência) */}
          <div className="space-y-1">
            <Label htmlFor="telefone_estab">
              Telefone do estabelecimento
              <span className="text-muted-foreground font-normal"> (para transferência — tecla 3)</span>
            </Label>
            <Input
              id="telefone_estab"
              type="tel"
              value={config.telefone_estabelecimento}
              onChange={(e) => setConfig((c) => ({ ...c, telefone_estabelecimento: e.target.value }))}
              placeholder="Ex: 11999998888 (apenas dígitos, com DDD)"
              disabled={!ehAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Custo estimado (informativo) ─────────────────────────────────────── */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <p className="font-medium">Custo estimado por ligação: R$ {CUSTO_ESTIMADO_REAIS.toFixed(2)}</p>
            <p className="text-xs">
              ElevenLabs ~R$0,30 (geração de voz) + Twilio ~R$0,08 (ligação ~45s).
              Valores aproximados; o custo real depende da duração da chamada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Script de confirmação (informativo) ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Script da ligação</CardTitle>
          <CardDescription>Mensagem gerada automaticamente (variáveis preenchidas em tempo real).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-3 text-sm leading-relaxed font-mono">
            "Olá, <span className="text-blue-500">{'{nome}'}</span>! Aqui é da{' '}
            <span className="text-blue-500">{'{estabelecimento}'}</span>. Estou ligando para confirmar
            seu agendamento de <span className="text-blue-500">{'{servico}'}</span> amanhã às{' '}
            <span className="text-blue-500">{'{hora}'}</span>. Para confirmar, pressione 1. Para
            cancelar, pressione 2. Para falar com a equipe, pressione 3."
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Os scripts são gerados em voz sintética com ElevenLabs e reproduzidos ao cliente.
          </p>
        </CardContent>
      </Card>

      {/* ── Botão salvar ─────────────────────────────────────────────────────── */}
      {ehAdmin && (
        <div className="flex justify-end">
          <Button onClick={salvar} disabled={salvando} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      )}

      {/* ── Histórico de ligações ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Histórico de ligações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ligação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-3 font-medium">Data</th>
                    <th className="text-left py-2 pr-3 font-medium">Status</th>
                    <th className="text-left py-2 pr-3 font-medium">Resultado</th>
                    <th className="text-left py-2 pr-3 font-medium">Tecla</th>
                    <th className="text-left py-2 pr-3 font-medium">Duração</th>
                    <th className="text-left py-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((l) => {
                    const st = LABELS_STATUS[l.status] ?? { label: l.status, variant: 'outline' as const }
                    return (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 pr-3 whitespace-nowrap text-xs">
                          {new Date(l.criado_em).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {l.resultado ? LABELS_RESULTADO[l.resultado] ?? l.resultado : '—'}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {l.dtmf ? LABELS_DTMF[l.dtmf] ?? `Tecla ${l.dtmf}` : '—'}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {l.duracao_segundos != null ? `${l.duracao_segundos}s` : '—'}
                        </td>
                        <td className="py-2 text-xs text-red-500 max-w-xs truncate" title={l.erro ?? ''}>
                          {l.erro ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaginaConfiguracaoLigacaoIA
