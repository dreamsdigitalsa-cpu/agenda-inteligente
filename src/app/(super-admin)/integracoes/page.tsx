// Super admin: configuração global de todas as integrações externas.
// Credenciais são criptografadas via Edge Function salvar-credenciais-sistema (AES-256-GCM).
// A UI nunca exibe credenciais salvas — apenas mostra badge "Configurado".
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff, Save, CheckCircle2, Globe, Mic, Phone, MessageSquare, Mail, CreditCard, AlertTriangle } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ConfigLigacaoIA {
  ativo:          boolean
  horario_inicio: string
  horario_fim:    string
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function InputSenha({
  id, label, value, onChange, placeholder, disabled,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-zinc-400 text-xs">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={placeholder}
          disabled={disabled}
          className="bg-zinc-800 border-zinc-700 pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
          onClick={() => setVisivel((v) => !v)}
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function Campo({
  id, label, value, onChange, placeholder, mono,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-zinc-400 text-xs">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder}
        className={`bg-zinc-800 border-zinc-700${mono ? ' font-mono text-sm' : ''}`}
      />
    </div>
  )
}

function BadgeConfigurado({ configurado }: { configurado: boolean }) {
  return configurado
    ? (
      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Configurado
      </Badge>
    )
    : (
      <Badge variant="outline" className="text-zinc-500 border-zinc-700">
        Não configurado
      </Badge>
    )
}

// ── Salvar credenciais via Edge Function (com criptografia) ───────────────────

async function salvarCredenciais(
  chave: string,
  credenciais: Record<string, unknown>,
  setSalvando: (v: boolean) => void,
  onSucesso?: () => void,
): Promise<string | null> {
  setSalvando(true)
  try {
    const { data, error } = await supabase.functions.invoke('salvar-credenciais-sistema', {
      body: { chave, credenciais },
    })
    if (error || (data as { erro?: string })?.erro) {
      return (data as { erro?: string })?.erro ?? error?.message ?? 'Erro desconhecido'
    }
    onSucesso?.()
    return null
  } finally {
    setSalvando(false)
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

const PaginaIntegracoes = () => {
  const [carregando, setCarregando] = useState(true)

  // Mapa de quais chaves já estão configuradas no banco
  const [configuradas, setConfiguradas] = useState<Record<string, boolean>>({})

  // Config global de ligação IA (não é credencial, salva direto)
  const [configIA, setConfigIA]           = useState<ConfigLigacaoIA>({ ativo: false, horario_inicio: '09:00', horario_fim: '19:00' })
  const [salvandoConfigIA, setSalvandoConfigIA] = useState(false)

  // WhatsApp (Z-API)
  const [zapiInstanceId,  setZapiInstanceId]  = useState('')
  const [zapiToken,       setZapiToken]       = useState('')
  const [zapiClientToken, setZapiClientToken] = useState('')
  const [zapiNumero,      setZapiNumero]      = useState('')
  const [salvandoZapi,    setSalvandoZapi]    = useState(false)
  const [erroZapi,        setErroZapi]        = useState<string | null>(null)

  // SMS
  const [smsProvider,   setSmsProvider]   = useState<'twilio' | 'zenvia'>('twilio')
  const [smsAccountSid, setSmsAccountSid] = useState('')
  const [smsAuthToken,  setSmsAuthToken]  = useState('')
  const [smsNumero,     setSmsNumero]     = useState('')
  const [zenviaToken,   setZenviaToken]   = useState('')
  const [salvandoSms,   setSalvandoSms]   = useState(false)
  const [erroSms,       setErroSms]       = useState<string | null>(null)

  // Email
  const [emailProvider,  setEmailProvider]  = useState<'resend' | 'sendgrid'>('resend')
  const [emailApiKey,    setEmailApiKey]    = useState('')
  const [emailFromEmail, setEmailFromEmail] = useState('')
  const [emailFromName,  setEmailFromName]  = useState('')
  const [salvandoEmail,  setSalvandoEmail]  = useState(false)
  const [erroEmail,      setErroEmail]      = useState<string | null>(null)

  // ElevenLabs + Twilio Voice (ligacao_ia_credenciais)
  const [elApiKey,      setElApiKey]      = useState('')
  const [elVoiceId,     setElVoiceId]     = useState('')
  const [twilioSid,     setTwilioSid]     = useState('')
  const [twilioToken,   setTwilioToken]   = useState('')
  const [twilioNumero,  setTwilioNumero]  = useState('')
  const [salvandoLig,   setSalvandoLig]   = useState(false)
  const [erroLig,       setErroLig]       = useState<string | null>(null)

  // Pagamento
  const [pagProvider,   setPagProvider]   = useState<'stripe' | 'asaas' | 'mercadopago'>('stripe')
  const [pagApiKey,     setPagApiKey]     = useState('')
  const [pagWebhook,    setPagWebhook]    = useState('')
  const [salvandoPag,   setSalvandoPag]   = useState(false)
  const [erroPag,       setErroPag]       = useState<string | null>(null)

  // ── Carregar estado das chaves ──────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setCarregando(true)
    const chaves = [
      'ligacao_ia_config',
      'whatsapp_credenciais',
      'sms_credenciais',
      'email_credenciais',
      'ligacao_ia_credenciais',
      'pagamento_credenciais',
    ]
    const { data } = (await supabase
      .from('configuracoes_sistema' as never)
      .select('chave, valor')
      .in('chave', chaves)
    ) as unknown as { data: { chave: string; valor: unknown }[] | null }

    const mapa: Record<string, boolean> = {}
    for (const row of data ?? []) {
      mapa[row.chave] = !!(row.valor)
      // Carregar config não-sensível de ligacao_ia
      if (row.chave === 'ligacao_ia_config' && typeof row.valor === 'object') {
        setConfigIA(row.valor as ConfigLigacaoIA)
      }
    }
    setConfiguradas(mapa)
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── Salvar config IA (não-sensível) ────────────────────────────────────────

  async function salvarConfigIA() {
    setSalvandoConfigIA(true)
    await (supabase
      .from('configuracoes_sistema' as never)
      .upsert({ chave: 'ligacao_ia_config', valor: configIA } as never, { onConflict: 'chave' })
    ) as unknown as Promise<unknown>
    setSalvandoConfigIA(false)
    await carregar()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="p-8 space-y-4">
        {[1,2,3].map((i) => <div key={i} className="h-40 bg-zinc-800 animate-pulse rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Globe className="h-6 w-6 text-violet-400" />
          Integrações externas
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Credenciais são criptografadas (AES-256-GCM) antes de serem salvas. A UI nunca exibe valores salvos.
        </p>
      </div>

      {/* ── WhatsApp ─────────────────────────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              WhatsApp via Z-API
            </CardTitle>
            <BadgeConfigurado configurado={!!configuradas['whatsapp_credenciais']} />
          </div>
          <CardDescription>Envio de mensagens e lembretes via WhatsApp Business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erroZapi && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erroZapi}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Campo id="zapi_instance" label="Instance ID" value={zapiInstanceId} onChange={setZapiInstanceId} placeholder="sua-instancia" />
            <InputSenha id="zapi_token" label="Token" value={zapiToken} onChange={setZapiToken} placeholder="Token da instância" />
            <InputSenha id="zapi_client_token" label="Client-Token (Business)" value={zapiClientToken} onChange={setZapiClientToken} placeholder="Opcional — plano Business" />
            <Campo id="zapi_numero" label="Número (com DDI)" value={zapiNumero} onChange={setZapiNumero} placeholder="+5511999998888" />
          </div>
          <Button
            disabled={salvandoZapi}
            onClick={async () => {
              setErroZapi(null)
              const err = await salvarCredenciais(
                'whatsapp_credenciais',
                { instance_id: zapiInstanceId, token: zapiToken, client_token: zapiClientToken || undefined, numero: zapiNumero },
                setSalvandoZapi,
                carregar,
              )
              if (err) setErroZapi(err)
              else { setZapiInstanceId(''); setZapiToken(''); setZapiClientToken(''); setZapiNumero('') }
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {salvandoZapi ? 'Criptografando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>

      {/* ── SMS ──────────────────────────────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-sky-400" />
              SMS
            </CardTitle>
            <BadgeConfigurado configurado={!!configuradas['sms_credenciais']} />
          </div>
          <CardDescription>Envio de SMS via Twilio ou Zenvia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erroSms && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erroSms}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Provedor</Label>
            <Select value={smsProvider} onValueChange={(v) => setSmsProvider(v as 'twilio' | 'zenvia')}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="zenvia">Zenvia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {smsProvider === 'twilio' ? (
            <div className="grid grid-cols-2 gap-3">
              <Campo id="sms_sid" label="Account SID" value={smsAccountSid} onChange={setSmsAccountSid} placeholder="ACxxxxxx" mono />
              <InputSenha id="sms_token" label="Auth Token" value={smsAuthToken} onChange={setSmsAuthToken} />
              <div className="col-span-2">
                <Campo id="sms_numero" label="Número de origem" value={smsNumero} onChange={setSmsNumero} placeholder="+5511999998888" />
              </div>
            </div>
          ) : (
            <InputSenha id="zenvia_token" label="API Token Zenvia" value={zenviaToken} onChange={setZenviaToken} placeholder="Token da conta Zenvia" />
          )}

          <Button
            disabled={salvandoSms}
            onClick={async () => {
              setErroSms(null)
              const creds = smsProvider === 'twilio'
                ? { provider: 'twilio', account_sid: smsAccountSid, auth_token: smsAuthToken, numero: smsNumero }
                : { provider: 'zenvia', token: zenviaToken }
              const err = await salvarCredenciais('sms_credenciais', creds, setSalvandoSms, carregar)
              if (err) setErroSms(err)
              else { setSmsAccountSid(''); setSmsAuthToken(''); setSmsNumero(''); setZenviaToken('') }
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {salvandoSms ? 'Criptografando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Email ─────────────────────────────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-amber-400" />
              E-mail transacional
            </CardTitle>
            <BadgeConfigurado configurado={!!configuradas['email_credenciais']} />
          </div>
          <CardDescription>Envio de e-mails via Resend ou SendGrid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erroEmail && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erroEmail}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Provedor</Label>
            <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as 'resend' | 'sendgrid')}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <InputSenha
              id="email_api_key"
              label={emailProvider === 'resend' ? 'Resend API Key' : 'SendGrid API Key'}
              value={emailApiKey}
              onChange={setEmailApiKey}
              placeholder={emailProvider === 'resend' ? 're_...' : 'SG...'}
            />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="email_from" label="E-mail remetente" value={emailFromEmail} onChange={setEmailFromEmail} placeholder="noreply@suaempresa.com" />
              <Campo id="email_from_name" label="Nome remetente" value={emailFromName} onChange={setEmailFromName} placeholder="StudioFlow" />
            </div>
          </div>
          <Button
            disabled={salvandoEmail}
            onClick={async () => {
              setErroEmail(null)
              const err = await salvarCredenciais(
                'email_credenciais',
                { provider: emailProvider, api_key: emailApiKey, from_email: emailFromEmail, from_name: emailFromName },
                setSalvandoEmail,
                carregar,
              )
              if (err) setErroEmail(err)
              else { setEmailApiKey(''); setEmailFromEmail(''); setEmailFromName('') }
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {salvandoEmail ? 'Criptografando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Ligação IA (ElevenLabs + Twilio Voice) ───────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-violet-400" />
              Ligação IA (ElevenLabs + Twilio)
            </CardTitle>
            <BadgeConfigurado configurado={!!configuradas['ligacao_ia_credenciais']} />
          </div>
          <CardDescription>Síntese de voz e ligações automáticas para confirmação de agendamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Config global (não-sensível) */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500 font-medium">Configuração global</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="ia_ativo" className="text-sm cursor-pointer">Ativar ligações IA globalmente</Label>
              <div className="flex items-center gap-2">
                <Badge variant={configIA.ativo ? 'default' : 'secondary'}>
                  {configIA.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                <Switch
                  id="ia_ativo"
                  checked={configIA.ativo}
                  onCheckedChange={(v) => setConfigIA((c) => ({ ...c, ativo: v }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Início do horário (Brasília)</Label>
                <Input type="time" value={configIA.horario_inicio}
                  onChange={(e) => setConfigIA((c) => ({ ...c, horario_inicio: e.target.value }))}
                  className="bg-zinc-700 border-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Fim do horário (Brasília)</Label>
                <Input type="time" value={configIA.horario_fim}
                  onChange={(e) => setConfigIA((c) => ({ ...c, horario_fim: e.target.value }))}
                  className="bg-zinc-700 border-zinc-600" />
              </div>
            </div>
            <Button size="sm" variant="outline" disabled={salvandoConfigIA} onClick={salvarConfigIA}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700">
              {salvandoConfigIA ? 'Salvando...' : 'Salvar configuração'}
            </Button>
          </div>

          {/* Credenciais */}
          {erroLig && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erroLig}
            </div>
          )}
          <Tabs defaultValue="elevenlabs">
            <TabsList className="bg-zinc-800">
              <TabsTrigger value="elevenlabs" className="data-[state=active]:bg-zinc-700">
                <Mic className="h-3.5 w-3.5 mr-1.5" /> ElevenLabs
              </TabsTrigger>
              <TabsTrigger value="twilio" className="data-[state=active]:bg-zinc-700">
                <Phone className="h-3.5 w-3.5 mr-1.5" /> Twilio Voice
              </TabsTrigger>
            </TabsList>
            <TabsContent value="elevenlabs" className="space-y-3 mt-3">
              <InputSenha id="el_key" label="ElevenLabs API Key" value={elApiKey} onChange={setElApiKey} placeholder="sk_..." />
              <Campo id="el_voice" label="Voice ID" value={elVoiceId} onChange={setElVoiceId} placeholder="pNInz6obpgDQGcFmaJgB" mono />
            </TabsContent>
            <TabsContent value="twilio" className="space-y-3 mt-3">
              <Campo id="tw_sid" label="Account SID" value={twilioSid} onChange={setTwilioSid} placeholder="ACxxxxxx" mono />
              <InputSenha id="tw_token" label="Auth Token" value={twilioToken} onChange={setTwilioToken} />
              <Campo id="tw_numero" label="Número de origem" value={twilioNumero} onChange={setTwilioNumero} placeholder="+5511999998888" />
            </TabsContent>
          </Tabs>

          <Button
            disabled={salvandoLig}
            onClick={async () => {
              setErroLig(null)
              const err = await salvarCredenciais(
                'ligacao_ia_credenciais',
                {
                  elevenlabs_api_key:   elApiKey   || undefined,
                  elevenlabs_voice_id:  elVoiceId  || undefined,
                  twilio_account_sid:   twilioSid   || undefined,
                  twilio_auth_token:    twilioToken || undefined,
                  twilio_numero:        twilioNumero || undefined,
                },
                setSalvandoLig,
                carregar,
              )
              if (err) setErroLig(err)
              else { setElApiKey(''); setElVoiceId(''); setTwilioSid(''); setTwilioToken(''); setTwilioNumero('') }
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {salvandoLig ? 'Criptografando...' : 'Salvar credenciais ElevenLabs + Twilio'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Gateway de pagamento ──────────────────────────────────────────── */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-rose-400" />
              Gateway de pagamento
            </CardTitle>
            <BadgeConfigurado configurado={!!configuradas['pagamento_credenciais']} />
          </div>
          <CardDescription>Cobranças de assinaturas e agendamentos pagos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erroPag && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erroPag}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Provedor</Label>
            <Select value={pagProvider} onValueChange={(v) => setPagProvider(v as 'stripe' | 'asaas' | 'mercadopago')}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <InputSenha
            id="pag_key"
            label={pagProvider === 'stripe' ? 'Secret Key (sk_...)' : pagProvider === 'asaas' ? 'API Key Asaas' : 'Access Token'}
            value={pagApiKey}
            onChange={setPagApiKey}
            placeholder={pagProvider === 'stripe' ? 'sk_live_...' : 'Token da API'}
          />
          <Campo
            id="pag_webhook"
            label="Webhook Secret"
            value={pagWebhook}
            onChange={setPagWebhook}
            placeholder={pagProvider === 'stripe' ? 'whsec_...' : 'Segredo do webhook'}
            mono
          />
          <Button
            disabled={salvandoPag}
            onClick={async () => {
              setErroPag(null)
              const err = await salvarCredenciais(
                'pagamento_credenciais',
                { provider: pagProvider, api_key: pagApiKey, webhook_secret: pagWebhook || undefined },
                setSalvandoPag,
                carregar,
              )
              if (err) setErroPag(err)
              else { setPagApiKey(''); setPagWebhook('') }
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {salvandoPag ? 'Criptografando...' : 'Salvar credenciais'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaginaIntegracoes
