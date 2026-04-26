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
import { 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  Globe, 
  Mic, 
  Phone, 
  MessageSquare, 
  Mail, 
  CreditCard, 
  AlertTriangle,
  ArrowLeft,
  Settings2,
  Lock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
          className="bg-zinc-800 border-zinc-700 pr-10 focus-visible:ring-violet-500"
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
  id, label, value, onChange, placeholder, mono, type = "text",
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; mono?: boolean; type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-zinc-400 text-xs">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder}
        className={`bg-zinc-800 border-zinc-700 focus-visible:ring-violet-500${mono ? ' font-mono text-sm' : ''}`}
      />
    </div>
  )
}

function BadgeConfigurado({ configurado }: { configurado: boolean }) {
  return configurado
    ? (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 font-normal">
        <CheckCircle2 className="h-3 w-3" /> Configurado
      </Badge>
    )
    : (
      <Badge variant="outline" className="text-zinc-500 border-zinc-800 font-normal">
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
  } catch (e: any) {
    return e.message || 'Erro ao invocar função'
  } finally {
    setSalvando(false)
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

const PaginaIntegracoes = () => {
  const [carregando, setCarregando] = useState(true)
  const [integracaoAtiva, setIntegracaoAtiva] = useState<string | null>(null)

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

  // Pagamento (Gateways)
  const [pagProvider,   setPagProvider]   = useState<'stripe' | 'asaas' | 'pagarme'>('stripe')
  const [pagApiKey,     setPagApiKey]     = useState('')
  const [pagPublicKey,  setPagPublicKey]  = useState('')
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
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="h-48 bg-zinc-900/50 border border-zinc-800 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  const integracoes = [
    {
      id: 'whatsapp',
      titulo: 'WhatsApp Business',
      descricao: 'Envio de mensagens e lembretes via Z-API.',
      icone: MessageSquare,
      cor: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      chave: 'whatsapp_credenciais',
    },
    {
      id: 'sms',
      titulo: 'SMS Gateway',
      descricao: 'Envio de SMS via Twilio ou Zenvia.',
      icone: MessageSquare,
      cor: 'text-sky-400',
      bg: 'bg-sky-400/10',
      chave: 'sms_credenciais',
    },
    {
      id: 'email',
      titulo: 'E-mail Transacional',
      descricao: 'Envio de e-mails via Resend ou SendGrid.',
      icone: Mail,
      cor: 'text-amber-400',
      bg: 'bg-amber-400/10',
      chave: 'email_credenciais',
    },
    {
      id: 'ligacao',
      titulo: 'Ligação IA',
      descricao: 'Voz via ElevenLabs e telefonia via Twilio.',
      icone: Phone,
      cor: 'text-violet-400',
      bg: 'bg-violet-400/10',
      chave: 'ligacao_ia_credenciais',
    },
    {
      id: 'pagamento',
      titulo: 'Pagamentos',
      descricao: 'Gateways Stripe, Asaas ou Pagar.me.',
      icone: CreditCard,
      cor: 'text-rose-400',
      bg: 'bg-rose-400/10',
      chave: 'pagamento_credenciais',
    },
  ]

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Globe className="h-8 w-8 text-violet-400" />
            Integrações
          </h1>
          <p className="text-zinc-400 text-sm mt-2 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Credenciais criptografadas via AES-256-GCM.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!integracaoAtiva ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {integracoes.map((item) => {
              const Icon = item.icone
              const isConfigurado = !!configuradas[item.chave]
              return (
                <Card 
                  key={item.id}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group relative overflow-hidden flex flex-col"
                  onClick={() => setIntegracaoAtiva(item.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${item.bg}`}>
                        <Icon className={`h-6 w-6 ${item.cor}`} />
                      </div>
                      <BadgeConfigurado configurado={isConfigurado} />
                    </div>
                    <CardTitle className="text-zinc-100 text-lg group-hover:text-white transition-colors">
                      {item.titulo}
                    </CardTitle>
                    <CardDescription className="text-zinc-400 line-clamp-2 mt-1">
                      {item.descricao}
                    </CardDescription>
                  </CardHeader>
                  <div className="mt-auto p-6 pt-0">
                    <Button variant="ghost" className="w-full justify-between hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700">
                      Configurar
                      <Settings2 className="h-4 w-4 opacity-50" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto w-full"
          >
            <Button 
              variant="ghost" 
              onClick={() => setIntegracaoAtiva(null)}
              className="mb-6 -ml-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista
            </Button>

            {/* ── Detalhes WhatsApp ───────────────────────────────────────── */}
            {integracaoAtiva === 'whatsapp' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-400" />
                    WhatsApp via Z-API
                  </CardTitle>
                  <CardDescription>Configure sua instância do Z-API para enviar mensagens automáticas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {erroZapi && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg text-sm border border-red-900/50">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {erroZapi}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Campo id="zapi_instance" label="Instance ID" value={zapiInstanceId} onChange={setZapiInstanceId} placeholder="sua-instancia" />
                    <InputSenha id="zapi_token" label="Token" value={zapiToken} onChange={setZapiToken} placeholder="Token da instância" />
                    <InputSenha id="zapi_client_token" label="Client-Token (Opcional)" value={zapiClientToken} onChange={setZapiClientToken} placeholder="Opcional — plano Business" />
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
                      else { 
                        setZapiInstanceId(''); setZapiToken(''); setZapiClientToken(''); setZapiNumero('')
                        setIntegracaoAtiva(null)
                      }
                    }}
                    className="w-full bg-violet-600 hover:bg-violet-700 h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {salvandoZapi ? 'Criptografando...' : 'Salvar configurações'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Detalhes SMS ────────────────────────────────────────────── */}
            {integracaoAtiva === 'sms' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-sky-400" />
                    Gateway de SMS
                  </CardTitle>
                  <CardDescription>Escolha entre Twilio ou Zenvia para o envio de mensagens SMS.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {erroSms && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg text-sm border border-red-900/50">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {erroSms}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Provedor</Label>
                    <Select value={smsProvider} onValueChange={(v) => setSmsProvider(v as 'twilio' | 'zenvia')}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="zenvia">Zenvia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {smsProvider === 'twilio' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Campo id="sms_sid" label="Account SID" value={smsAccountSid} onChange={setSmsAccountSid} placeholder="ACxxxxxx" mono />
                      <InputSenha id="sms_token" label="Auth Token" value={smsAuthToken} onChange={setSmsAuthToken} />
                      <div className="md:col-span-2">
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
                      else { 
                        setSmsAccountSid(''); setSmsAuthToken(''); setSmsNumero(''); setZenviaToken('')
                        setIntegracaoAtiva(null)
                      }
                    }}
                    className="w-full bg-violet-600 hover:bg-violet-700 h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {salvandoSms ? 'Criptografando...' : 'Salvar configurações'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Detalhes E-mail ─────────────────────────────────────────── */}
            {integracaoAtiva === 'email' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-amber-400" />
                    E-mail Transacional
                  </CardTitle>
                  <CardDescription>Configurações para envio de e-mails automáticos do sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {erroEmail && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg text-sm border border-red-900/50">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {erroEmail}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Provedor</Label>
                    <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as 'resend' | 'sendgrid')}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <InputSenha
                      id="email_api_key"
                      label="Chave da API"
                      value={emailApiKey}
                      onChange={setEmailApiKey}
                      placeholder={emailProvider === 'resend' ? 're_...' : 'SG...'}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      else { 
                        setEmailApiKey(''); setEmailFromEmail(''); setEmailFromName('')
                        setIntegracaoAtiva(null)
                      }
                    }}
                    className="w-full bg-violet-600 hover:bg-violet-700 h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {salvandoEmail ? 'Criptografando...' : 'Salvar configurações'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Detalhes Ligação IA ──────────────────────────────────────── */}
            {integracaoAtiva === 'ligacao' && (
              <div className="space-y-6">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-zinc-400" />
                      Controle Global
                    </CardTitle>
                    <CardDescription>Defina quando o sistema pode realizar chamadas automáticas.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-zinc-800/30 rounded-xl p-5 space-y-4 border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="ia_ativo" className="text-sm font-medium">Status do Serviço</Label>
                          <p className="text-xs text-zinc-500">Ativa ou desativa ligações para todos os tenants.</p>
                        </div>
                        <Switch
                          id="ia_ativo"
                          checked={configIA.ativo}
                          onCheckedChange={(v) => setConfigIA((c) => ({ ...c, ativo: v }))}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <Campo id="ia_inicio" label="Horário Início" type="time" value={configIA.horario_inicio} onChange={(v) => setConfigIA(c => ({...c, horario_inicio: v}))} />
                        <Campo id="ia_fim" label="Horário Fim" type="time" value={configIA.horario_fim} onChange={(v) => setConfigIA(c => ({...c, horario_fim: v}))} />
                      </div>
                      
                      <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 h-10" onClick={salvarConfigIA} disabled={salvandoConfigIA}>
                        {salvandoConfigIA ? 'Salvando...' : 'Aplicar configurações globais'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                      <Phone className="h-5 w-5 text-violet-400" />
                      Credenciais de Voz e Telefonia
                    </CardTitle>
                    <CardDescription>Configure os serviços da ElevenLabs e Twilio.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {erroLig && (
                      <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg text-sm border border-red-900/50">
                        <AlertTriangle className="h-4 w-4 shrink-0" /> {erroLig}
                      </div>
                    )}
                    <Tabs defaultValue="elevenlabs" className="w-full">
                      <TabsList className="bg-zinc-800 w-full grid grid-cols-2">
                        <TabsTrigger value="elevenlabs" className="data-[state=active]:bg-zinc-700">
                          <Mic className="h-3.5 w-3.5 mr-2" /> ElevenLabs
                        </TabsTrigger>
                        <TabsTrigger value="twilio" className="data-[state=active]:bg-zinc-700">
                          <Phone className="h-3.5 w-3.5 mr-2" /> Twilio Voice
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="elevenlabs" className="space-y-4 mt-4 animate-in fade-in duration-300">
                        <InputSenha id="el_key" label="ElevenLabs API Key" value={elApiKey} onChange={setElApiKey} placeholder="sk_..." />
                        <Campo id="el_voice" label="Voice ID (Voz padrão)" value={elVoiceId} onChange={setElVoiceId} placeholder="ID da voz no painel ElevenLabs" mono />
                      </TabsContent>
                      <TabsContent value="twilio" className="space-y-4 mt-4 animate-in fade-in duration-300">
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
                        else { 
                          setElApiKey(''); setElVoiceId(''); setTwilioSid(''); setTwilioToken(''); setTwilioNumero('')
                          setIntegracaoAtiva(null)
                        }
                      }}
                      className="w-full bg-violet-600 hover:bg-violet-700 h-11"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {salvandoLig ? 'Criptografando...' : 'Salvar credenciais ElevenLabs + Twilio'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Detalhes Pagamentos ─────────────────────────────────────── */}
            {integracaoAtiva === 'pagamento' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-rose-400" />
                    Gateway de Pagamento
                  </CardTitle>
                  <CardDescription>Configure o provedor principal para recebimentos do sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {erroPag && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-4 rounded-lg text-sm border border-red-900/50">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {erroPag}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Provedor Principal</Label>
                    <Select value={pagProvider} onValueChange={(v) => setPagProvider(v as 'stripe' | 'asaas' | 'pagarme')}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="asaas">Asaas</SelectItem>
                        <SelectItem value="pagarme">Pagar.me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <InputSenha 
                      id="pag_api_key" 
                      label="API Key / Secret Key" 
                      value={pagApiKey} 
                      onChange={setPagApiKey} 
                      placeholder={pagProvider === 'stripe' ? 'sk_live_...' : 'Token da API'}
                    />
                    <Campo id="pag_pub_key" label="Public Key (Opcional)" value={pagPublicKey} onChange={setPagPublicKey} placeholder="pk_..." />
                    <InputSenha id="pag_webhook" label="Webhook Secret / Token" value={pagWebhook} onChange={setPagWebhook} />
                  </div>

                  <Button
                    disabled={salvandoPag}
                    onClick={async () => {
                      setErroPag(null)
                      const err = await salvarCredenciais(
                        'pagamento_credenciais',
                        { provider: pagProvider, api_key: pagApiKey, public_key: pagPublicKey, webhook_secret: pagWebhook },
                        setSalvandoPag,
                        carregar,
                      )
                      if (err) setErroPag(err)
                      else { 
                        setPagApiKey(''); setPagPublicKey(''); setPagWebhook('')
                        setIntegracaoAtiva(null)
                      }
                    }}
                    className="w-full bg-violet-600 hover:bg-violet-700 h-11"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {salvandoPag ? 'Criptografando...' : 'Salvar configurações'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PaginaIntegracoes
