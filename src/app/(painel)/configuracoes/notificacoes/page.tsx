// Configurações de notificações automáticas.
// Permite ao admin ativar/desativar tipos de lembrete, configurar canais de envio,
// inserir credenciais do WhatsApp (Z-API) e visualizar o histórico de envios.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Bell, MessageSquare, Clock, History, Save, Eye, Wifi } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ConfigNotificacoes {
  lembrete_24h_ativo:   boolean
  lembrete_1h_ativo:    boolean
  canal_whatsapp_ativo: boolean
  canal_email_ativo:    boolean
  canal_sms_ativo:      boolean
}

interface CredenciaisZApi {
  instance_id:   string
  token:         string
  client_token:  string
}

interface NotificacaoHistorico {
  id:            string
  tipo:          string
  canal:         string
  status:        string
  tentativas:    number
  agendado_para: string
  enviado_em:    string | null
  erro:          string | null
  criado_em:     string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const CONFIG_PADRAO: ConfigNotificacoes = {
  lembrete_24h_ativo:   true,
  lembrete_1h_ativo:    true,
  canal_whatsapp_ativo: false,
  canal_email_ativo:    false,
  canal_sms_ativo:      false,
}

const CREDS_VAZIAS: CredenciaisZApi = { instance_id: '', token: '', client_token: '' }

const LABELS_TIPO: Record<string, string> = {
  lembrete_24h: 'Lembrete 24h',
  lembrete_1h:  'Lembrete 1h',
  confirmacao:  'Confirmação',
  cancelamento: 'Cancelamento',
}

const LABELS_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente',  variant: 'secondary' },
  enviado:  { label: 'Enviado',   variant: 'default' },
  falhou:   { label: 'Falhou',    variant: 'destructive' },
  cancelado:{ label: 'Cancelado', variant: 'outline' },
}

// Variáveis de exemplo usadas no preview dos templates
const VARS_PREVIEW: Record<string, string> = {
  nome:            'Maria Silva',
  servico:         'Corte de cabelo',
  hora:            '14:00',
  data:            '25/04',
  profissional:    'Ana Oliveira',
  estabelecimento: 'HubBeleza',
}

const TEMPLATES_PREVIEW: Record<string, string> = {
  lembrete_24h:
    'Olá {nome}! Lembrete: você tem {servico} amanhã às {hora} com {profissional} na {estabelecimento}. Responda CONFIRMAR ou CANCELAR.',
  lembrete_1h:
    'Olá {nome}! Daqui a 1 hora você tem {servico} com {profissional}. Te esperamos! 😊',
  confirmacao:
    '✅ Agendamento confirmado! {servico} em {data} às {hora} com {profissional}.',
}

function renderPreview(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => VARS_PREVIEW[key] ?? `{${key}}`)
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function LinhaSwitch({
  id,
  label,
  descricao,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  descricao?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <Label htmlFor={id} className="font-medium cursor-pointer">{label}</Label>
        {descricao && <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const PaginaConfiguracoesNotificacoes = () => {
  const { tenant } = useTenant()
  const { ehAdmin } = usePermissao()

  const [config, setConfig]           = useState<ConfigNotificacoes>(CONFIG_PADRAO)
  const [creds, setCreds]             = useState<CredenciaisZApi>(CREDS_VAZIAS)
  const [historico, setHistorico]     = useState<NotificacaoHistorico[]>([])
  const [carregando, setCarregando]   = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [salvandoCreds, setSalvandoCreds] = useState(false)
  const [testando, setTestando]       = useState(false)

  // ── Carregamento inicial ────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    if (!tenant?.id) return
    setCarregando(true)

    // Configurações de notificações
    const { data: configDB } = (await supabase
      .from('configuracoes_notificacoes' as never)
      .select('lembrete_24h_ativo, lembrete_1h_ativo, canal_whatsapp_ativo, canal_email_ativo, canal_sms_ativo')
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    ) as unknown as { data: ConfigNotificacoes | null }

    if (configDB) setConfig(configDB)

    // Credenciais Z-API (apenas campos que o admin precisa preencher)
    const { data: integracaoDB } = (await supabase
      .from('integracoes_plataforma' as never)
      .select('credenciais')
      .eq('tenant_id', tenant.id)
      .eq('plataforma', 'zapi')
      .maybeSingle()
    ) as unknown as { data: { credenciais: CredenciaisZApi } | null }

    if (integracaoDB?.credenciais) {
      setCreds({
        instance_id:  integracaoDB.credenciais.instance_id  ?? '',
        token:        integracaoDB.credenciais.token         ?? '',
        client_token: integracaoDB.credenciais.client_token  ?? '',
      })
    }

    // Histórico — últimas 30 notificações
    const { data: historicoRows } = (await supabase
      .from('notificacoes_fila' as never)
      .select('id, tipo, canal, status, tentativas, agendado_para, enviado_em, erro, criado_em')
      .eq('tenant_id', tenant.id)
      .order('criado_em', { ascending: false })
      .limit(30)
    ) as unknown as { data: NotificacaoHistorico[] | null }

    setHistorico(historicoRows ?? [])
    setCarregando(false)
  }, [tenant?.id])

  useEffect(() => { carregar() }, [carregar])

  // ── Salvar configurações de lembretes e canais ──────────────────────────────

  async function salvarConfig() {
    if (!tenant?.id || !ehAdmin) return
    setSalvando(true)

    const { error } = await supabase
      .from('configuracoes_notificacoes' as never)
      .upsert({ tenant_id: tenant.id, ...config }, { onConflict: 'tenant_id' })

    if (error) {
      toast.error('Erro ao salvar configurações')
    } else {
      toast.success('Configurações salvas')
    }
    setSalvando(false)
  }

  // ── Salvar credenciais Z-API ────────────────────────────────────────────────

  async function salvarCreds() {
    if (!tenant?.id || !ehAdmin) return
    if (!creds.instance_id || !creds.token) {
      toast.error('Preencha o Instance ID e o Token')
      return
    }
    setSalvandoCreds(true)

    const { error } = await supabase
      .from('integracoes_plataforma' as never)
      .upsert(
        {
          tenant_id:    tenant.id,
          plataforma:   'zapi',
          credenciais:  creds,
          ativo:        config.canal_whatsapp_ativo,
        },
        { onConflict: 'tenant_id,plataforma' },
      )

    if (error) {
      toast.error('Erro ao salvar credenciais')
    } else {
      toast.success('Credenciais salvas')
    }
    setSalvandoCreds(false)
  }

  // ── Testar conexão WhatsApp ─────────────────────────────────────────────────

  async function testarWhatsApp() {
    if (!tenant?.id) return
    setTestando(true)
    const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
      body: {
        tenant_id: tenant.id,
        telefone:  '5500000000000',  // número fictício para validar apenas a conexão
        mensagem:  '✅ Teste de conexão HubBeleza — tudo certo!',
        tipo:      'teste',
      },
    })
    setTestando(false)

    if (error || !(data as { sucesso?: boolean })?.sucesso) {
      const erroMsg = (data as { erro?: string })?.erro ?? error?.message ?? 'falha desconhecida'
      toast.error(`Falha no teste: ${erroMsg}`)
    } else {
      toast.success('Mensagem de teste enviada com sucesso!')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="container mx-auto p-6">
        <div className="h-6 w-64 bg-muted animate-pulse rounded mb-4" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notificações automáticas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure lembretes enviados automaticamente aos clientes antes de cada atendimento.
        </p>
      </header>

      {!ehAdmin && (
        <Card>
          <CardContent className="p-4 text-muted-foreground text-sm">
            Apenas administradores podem alterar as configurações de notificações.
          </CardContent>
        </Card>
      )}

      {/* ── Tipos de lembrete ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Tipos de lembrete
          </CardTitle>
          <CardDescription>Escolha quando os clientes receberão notificações.</CardDescription>
        </CardHeader>
        <CardContent>
          <LinhaSwitch
            id="lembrete_24h"
            label="Lembrete 24 horas antes"
            descricao="Enviado no dia anterior ao atendimento."
            checked={config.lembrete_24h_ativo}
            onChange={(v) => setConfig((c) => ({ ...c, lembrete_24h_ativo: v }))}
            disabled={!ehAdmin}
          />
          <LinhaSwitch
            id="lembrete_1h"
            label="Lembrete 1 hora antes"
            descricao="Enviado 1 hora antes do início do atendimento."
            checked={config.lembrete_1h_ativo}
            onChange={(v) => setConfig((c) => ({ ...c, lembrete_1h_ativo: v }))}
            disabled={!ehAdmin}
          />
        </CardContent>
      </Card>

      {/* ── Canais de envio ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Canais de envio
          </CardTitle>
          <CardDescription>Ao ativar múltiplos canais, a prioridade é WhatsApp › SMS › E-mail.</CardDescription>
        </CardHeader>
        <CardContent>
          <LinhaSwitch
            id="canal_whatsapp"
            label="WhatsApp"
            descricao="Requer integração Z-API configurada abaixo."
            checked={config.canal_whatsapp_ativo}
            onChange={(v) => setConfig((c) => ({ ...c, canal_whatsapp_ativo: v }))}
            disabled={!ehAdmin}
          />
          <LinhaSwitch
            id="canal_email"
            label="E-mail"
            descricao="Em breve — integração com SendGrid."
            checked={config.canal_email_ativo}
            onChange={(v) => setConfig((c) => ({ ...c, canal_email_ativo: v }))}
            disabled={!ehAdmin}
          />
          <LinhaSwitch
            id="canal_sms"
            label="SMS"
            descricao="Em breve — integração com Twilio."
            checked={config.canal_sms_ativo}
            onChange={(v) => setConfig((c) => ({ ...c, canal_sms_ativo: v }))}
            disabled={!ehAdmin}
          />
        </CardContent>
      </Card>

      {/* ── Credenciais WhatsApp (Z-API) ──────────────────────────────────── */}
      {config.canal_whatsapp_ativo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="h-4 w-4" />
              Integração WhatsApp — Z-API
            </CardTitle>
            <CardDescription>
              Obtenha as credenciais em{' '}
              <span className="font-mono text-xs">app.z-api.io</span> após criar sua instância.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="instance_id">Instance ID</Label>
                <Input
                  id="instance_id"
                  placeholder="Ex: 3D5A1234..."
                  value={creds.instance_id}
                  onChange={(e) => setCreds((c) => ({ ...c, instance_id: e.target.value.trim() }))}
                  disabled={!ehAdmin}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zapi_token">Token</Label>
                <Input
                  id="zapi_token"
                  type="password"
                  placeholder="Token da instância"
                  value={creds.token}
                  onChange={(e) => setCreds((c) => ({ ...c, token: e.target.value.trim() }))}
                  disabled={!ehAdmin}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="client_token">
                Client-Token{' '}
                <span className="text-muted-foreground font-normal">(opcional — plano Business)</span>
              </Label>
              <Input
                id="client_token"
                type="password"
                placeholder="Client token do plano Business"
                value={creds.client_token}
                onChange={(e) => setCreds((c) => ({ ...c, client_token: e.target.value.trim() }))}
                disabled={!ehAdmin}
              />
            </div>

            {ehAdmin && (
              <div className="flex gap-2 pt-2">
                <Button onClick={salvarCreds} disabled={salvandoCreds}>
                  <Save className="mr-1 h-4 w-4" />
                  {salvandoCreds ? 'Salvando...' : 'Salvar credenciais'}
                </Button>
                <Button variant="outline" onClick={testarWhatsApp} disabled={testando || !creds.instance_id || !creds.token}>
                  <Wifi className="mr-1 h-4 w-4" />
                  {testando ? 'Testando...' : 'Testar conexão'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Preview dos templates ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Preview das mensagens
          </CardTitle>
          <CardDescription>Como as mensagens chegam ao cliente (dados fictícios).</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lembrete_24h">
            <TabsList className="mb-4">
              <TabsTrigger value="lembrete_24h">Lembrete 24h</TabsTrigger>
              <TabsTrigger value="lembrete_1h">Lembrete 1h</TabsTrigger>
              <TabsTrigger value="confirmacao">Confirmação</TabsTrigger>
            </TabsList>

            {Object.entries(TEMPLATES_PREVIEW).map(([tipo, template]) => (
              <TabsContent key={tipo} value={tipo}>
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  {/* Bolha de WhatsApp simulada */}
                  <div className="inline-block max-w-xs bg-white dark:bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow text-sm leading-relaxed">
                    {renderPreview(template)}
                  </div>
                  {/* Template bruto com variáveis destacadas */}
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    {template}
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Histórico de envios ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Histórico de envios recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma notificação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                    <th className="text-left py-2 pr-4 font-medium">Canal</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                    <th className="text-left py-2 pr-4 font-medium">Tentativas</th>
                    <th className="text-left py-2 pr-4 font-medium">Agendado para</th>
                    <th className="text-left py-2 font-medium">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((n) => {
                    const st = LABELS_STATUS[n.status] ?? { label: n.status, variant: 'outline' as const }
                    return (
                      <tr key={n.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2 pr-4">{LABELS_TIPO[n.tipo] ?? n.tipo}</td>
                        <td className="py-2 pr-4 capitalize">{n.canal}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-center">{n.tentativas}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {new Date(n.agendado_para).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 text-red-500 text-xs max-w-xs truncate" title={n.erro ?? ''}>
                          {n.erro ?? '—'}
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

      {/* ── Botão salvar configurações ────────────────────────────────────── */}
      {ehAdmin && (
        <div className="flex justify-end">
          <Button onClick={salvarConfig} disabled={salvando} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default PaginaConfiguracoesNotificacoes
