// Super admin: configuração global de integrações externas.
// Gerencia credenciais ElevenLabs (geração de voz IA) e Twilio (ligações),
// toggle global de ligações IA e horário permitido para chamadas.
// Todos os dados são gravados em configuracoes_sistema (RLS super_admin-only para credenciais).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { usePermissao } from '@/hooks/usePermissao'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Mic, Phone, Globe, Save, Eye, EyeOff, AlertTriangle } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ConfigGlobal {
  ativo:          boolean
  horario_inicio: string
  horario_fim:    string
}

interface Credenciais {
  elevenlabs_api_key:   string
  elevenlabs_voice_id:  string
  twilio_account_sid:   string
  twilio_auth_token:    string
  twilio_numero:        string
}

const CONFIG_PADRAO: ConfigGlobal = {
  ativo:          false,
  horario_inicio: '09:00',
  horario_fim:    '19:00',
}

const CREDS_VAZIAS: Credenciais = {
  elevenlabs_api_key:   '',
  elevenlabs_voice_id:  '',
  twilio_account_sid:   '',
  twilio_auth_token:    '',
  twilio_numero:        '',
}

// ── Componente de input com máscara de senha ─────────────────────────────────

function InputSenha({
  id, label, value, onChange, placeholder, disabled,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setVisivel((v) => !v)}
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const PaginaIntegracoes = () => {
  const { ehSuperAdmin } = usePermissao()

  const [config, setConfig]       = useState<ConfigGlobal>(CONFIG_PADRAO)
  const [creds, setCreds]         = useState<Credenciais>(CREDS_VAZIAS)
  const [carregando, setCarregando] = useState(true)
  const [salvandoConfig, setSalvandoConfig]   = useState(false)
  const [salvandoCreds, setSalvandoCreds]     = useState(false)

  // ── Carregamento inicial ────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setCarregando(true)

    const [{ data: cfgRow }, { data: credsRow }] = await Promise.all([
      (supabase as ReturnType<typeof supabase.from> & Record<string, unknown>)
        .from('configuracoes_sistema' as never)
        .select('valor')
        .eq('chave', 'ligacao_ia_config')
        .maybeSingle() as unknown as Promise<{ data: { valor: ConfigGlobal } | null }>,
      (supabase as ReturnType<typeof supabase.from> & Record<string, unknown>)
        .from('configuracoes_sistema' as never)
        .select('valor')
        .eq('chave', 'ligacao_ia_credenciais')
        .maybeSingle() as unknown as Promise<{ data: { valor: Credenciais } | null }>,
    ])

    if (cfgRow?.valor)   setConfig(cfgRow.valor)
    if (credsRow?.valor) setCreds({ ...CREDS_VAZIAS, ...credsRow.valor })
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── Salvar config global (ativo + horários) ─────────────────────────────────

  async function salvarConfig() {
    setSalvandoConfig(true)
    const { error } = await (supabase as unknown as { from: (t: string) => unknown })
      .from('configuracoes_sistema' as never)
      // @ts-expect-error tabela nova não está nos tipos gerados
      .upsert({ chave: 'ligacao_ia_config', valor: config }, { onConflict: 'chave' })
    setSalvandoConfig(false)
    error ? toast.error('Erro ao salvar configurações') : toast.success('Configurações salvas')
  }

  // ── Salvar credenciais ──────────────────────────────────────────────────────

  async function salvarCredenciais() {
    const campos = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k)
    if (campos.length > 0) {
      toast.error(`Preencha: ${campos.join(', ')}`)
      return
    }
    setSalvandoCreds(true)
    const { error } = await (supabase as unknown as { from: (t: string) => unknown })
      .from('configuracoes_sistema' as never)
      // @ts-expect-error tabela nova não está nos tipos gerados
      .upsert({ chave: 'ligacao_ia_credenciais', valor: creds }, { onConflict: 'chave' })
    setSalvandoCreds(false)
    error ? toast.error('Erro ao salvar credenciais') : toast.success('Credenciais salvas')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!ehSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Acesso restrito a super administradores.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-2xl">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" />
          Integrações externas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure as credenciais globais de ElevenLabs e Twilio para ligações IA.
        </p>
      </header>

      {/* ── Ligação IA — Toggle global e horários ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Ligações IA — Configuração global
          </CardTitle>
          <CardDescription>
            Controla se a feature está disponível para todos os tenants da plataforma.
            Cada tenant ainda pode desativar individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle global */}
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <Label htmlFor="toggle_global" className="font-medium cursor-pointer">
                Ativar ligações IA globalmente
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando desativado, nenhum tenant pode iniciar ligações IA.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.ativo ? 'default' : 'secondary'}>
                {config.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              <Switch
                id="toggle_global"
                checked={config.ativo}
                onCheckedChange={(v) => setConfig((c) => ({ ...c, ativo: v }))}
              />
            </div>
          </div>

          {/* Horários */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="horario_inicio">Início do horário permitido</Label>
              <Input
                id="horario_inicio"
                type="time"
                value={config.horario_inicio}
                onChange={(e) => setConfig((c) => ({ ...c, horario_inicio: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Horário de Brasília (UTC-3)</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="horario_fim">Fim do horário permitido</Label>
              <Input
                id="horario_fim"
                type="time"
                value={config.horario_fim}
                onChange={(e) => setConfig((c) => ({ ...c, horario_fim: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={salvarConfig} disabled={salvandoConfig}>
            <Save className="mr-1 h-4 w-4" />
            {salvandoConfig ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </CardContent>
      </Card>

      {/* ── ElevenLabs ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" />
            ElevenLabs — Síntese de voz
          </CardTitle>
          <CardDescription>
            API de geração de áudio em português brasileiro.
            Obtenha as credenciais em{' '}
            <span className="font-mono text-xs">elevenlabs.io/app/settings/api-keys</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputSenha
            id="el_api_key"
            label="API Key"
            value={creds.elevenlabs_api_key}
            onChange={(v) => setCreds((c) => ({ ...c, elevenlabs_api_key: v }))}
            placeholder="sk_..."
          />
          <div className="space-y-1">
            <Label htmlFor="el_voice_id">Voice ID</Label>
            <Input
              id="el_voice_id"
              value={creds.elevenlabs_voice_id}
              onChange={(e) => setCreds((c) => ({ ...c, elevenlabs_voice_id: e.target.value.trim() }))}
              placeholder="Ex: pNInz6obpgDQGcFmaJgB"
            />
            <p className="text-xs text-muted-foreground">
              Use uma voz em português. Encontre IDs em elevenlabs.io/app/voice-lab.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Twilio ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Twilio — Ligações telefônicas
          </CardTitle>
          <CardDescription>
            Plataforma de comunicação para chamadas de voz.
            Configure em{' '}
            <span className="font-mono text-xs">console.twilio.com</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="twilio_sid">Account SID</Label>
            <Input
              id="twilio_sid"
              value={creds.twilio_account_sid}
              onChange={(e) => setCreds((c) => ({ ...c, twilio_account_sid: e.target.value.trim() }))}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <InputSenha
            id="twilio_token"
            label="Auth Token"
            value={creds.twilio_auth_token}
            onChange={(v) => setCreds((c) => ({ ...c, twilio_auth_token: v }))}
            placeholder="Token secreto do console Twilio"
          />

          <div className="space-y-1">
            <Label htmlFor="twilio_numero">Número de origem (From)</Label>
            <Input
              id="twilio_numero"
              value={creds.twilio_numero}
              onChange={(e) => setCreds((c) => ({ ...c, twilio_numero: e.target.value.trim() }))}
              placeholder="+5511999998888"
            />
            <p className="text-xs text-muted-foreground">
              Número Twilio verificado. Inclua o código do país (+55 para Brasil).
            </p>
          </div>

          {/* Instrução do webhook */}
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="text-xs font-medium">URL do webhook Twilio</p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {window.location.origin.replace('3000', '').replace('localhost', '[projeto].supabase.co')}/functions/v1/twilio-webhook
            </p>
            <p className="text-xs text-muted-foreground">
              Não é necessário configurar no console Twilio — a URL é gerada automaticamente ao iniciar cada ligação.
            </p>
          </div>

          <Button onClick={salvarCredenciais} disabled={salvandoCreds}>
            <Save className="mr-1 h-4 w-4" />
            {salvandoCreds ? 'Salvando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaginaIntegracoes
