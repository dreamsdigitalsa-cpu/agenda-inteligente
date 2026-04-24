// Página PÚBLICA de agendamento online (sem autenticação).
// Acesso: /agendar/:slug — usa Edge Function agendamento-publico (service role)
// para ler dados e criar o agendamento sem expor RLS ao usuário anônimo.
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

// URL pública da Edge Function
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agendamento-publico`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Schema de validação dos dados do cliente (passo 4)
const clienteSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(100),
  telefone: z.string().trim().min(8, 'Telefone inválido').max(30),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
})

interface Tenant { id: string; nome: string; plano: string }
interface Configuracao { logo_url: string | null; cor_principal: string | null }
interface Servico { id: string; nome: string; duracao_minutos: number; preco_centavos: number }
interface Profissional { id: string; nome: string; especialidade: string | null }
interface Slot { hora: string; livre: boolean }

async function chamar(params: Record<string, string>, init?: RequestInit) {
  const qs = new URLSearchParams(params).toString()
  const r = await fetch(`${FN_URL}?${qs}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  return r.json()
}

const PaginaAgendamentoOnline = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const [passo, setPasso] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [tenant, setTenant] = useState<(Tenant & { segmento: string }) | null>(null)
  const [modo, setModo] = useState<'agendamento' | 'fila'>('agendamento')
  const [posicaoFila, setPosicaoFila] = useState<number | null>(null)

  const [config, setConfig] = useState<Configuracao | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)

  // Seleções
  const [servico, setServico] = useState<Servico | null>(null)
  const [profissional, setProfissional] = useState<Profissional | 'qualquer' | null>(null)
  const [data, setData] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [hora, setHora] = useState<string>('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [aceitaLembretes, setAceitaLembretes] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ confirmacaoManual: boolean } | null>(null)

  // Carrega tenant + serviços + profissionais
  useEffect(() => {
    if (!slug) return
    Promise.all([
      chamar({ acao: 'tenant', slug }),
      chamar({ acao: 'servicos', slug }),
      chamar({ acao: 'profissionais', slug }),
    ]).then(([t, s, p]) => {
      if (t.erro) { setErroCarregar(t.erro); return }
      setTenant(t.tenant); setConfig(t.configuracao)
      setServicos(s.servicos ?? [])
      setProfissionais(p.profissionais ?? [])
    }).catch(() => setErroCarregar('erro_carregar'))
  }, [slug])

  // Carrega slots quando profissional/serviço/data mudam
  useEffect(() => {
    if (!servico || !data) return
    const params: Record<string, string> = {
      acao: 'slots', slug, data, duracao: String(servico.duracao_minutos),
    }
    if (profissional && profissional !== 'qualquer') params.profissional_id = profissional.id
    chamar(params).then((r) => setSlots(r.slots ?? []))
  }, [slug, servico, data, profissional])

  const proximosDias = useMemo(() => {
    // Gera próximos 14 dias úteis (sem sábado/domingo)
    const lista: { iso: string; label: string }[] = []
    const hoje = new Date()
    for (let i = 0; lista.length < 14 && i < 30; i++) {
      const d = new Date(hoje)
      d.setDate(d.getDate() + i)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue
      lista.push({
        iso: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      })
    }
    return lista
  }, [])

  const entrarNaFila = async () => {
    const parsed = clienteSchema.safeParse({ nome, telefone })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }
    setEnviando(true)
    const r = await chamar({ acao: 'entrar-na-fila', slug }, {
      method: 'POST',
      body: JSON.stringify({
        nome, telefone,
        servico_id: servico?.id || null,
        profissional_id: profissional && profissional !== 'qualquer' ? profissional.id : null,
      }),
    })
    setEnviando(false)
    if (r.erro) {
      toast.error('Não foi possível entrar na fila')
      return
    }
    setPosicaoFila(r.posicao)
    setPasso(5)
  }

  const submeter = async () => {

    const parsed = clienteSchema.safeParse({ nome, telefone, email })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message)
      return
    }
    setEnviando(true)
    const r = await chamar({ acao: 'criar', slug }, {
      method: 'POST',
      body: JSON.stringify({
        nome, telefone, email: email || null,
        servico_id: servico!.id,
        profissional_id: profissional && profissional !== 'qualquer' ? profissional.id : null,
        data, hora,
        aceita_lembretes: aceitaLembretes,
      }),
    })
    setEnviando(false)
    if (r.erro) {
      const msgs: Record<string, string> = {
        limite_freemium_atingido: 'O estabelecimento atingiu o limite mensal. Por favor, entre em contato por telefone.',
        horario_ocupado: 'Este horário acabou de ser ocupado. Escolha outro.',
      }
      toast.error(msgs[r.erro] ?? 'Não foi possível agendar')
      return
    }
    setResultado({ confirmacaoManual: r.confirmacaoManual })
    setPasso(5)
  }

  if (erroCarregar) {
    return <Centro>Estabelecimento não encontrado.</Centro>
  }
  if (!tenant) {
    return <Centro>Carregando…</Centro>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho */}
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          {config?.logo_url && (
            <img src={config.logo_url} alt={tenant.nome} className="h-10 w-10 rounded object-cover" />
          )}
          <div>
            <h1 className="text-lg font-semibold">{tenant.nome}</h1>
            <p className="text-xs text-muted-foreground">Agendamento online</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Indicador de passo */}
        <div className="flex justify-between text-xs text-muted-foreground">
          {['Serviço', 'Profissional', 'Horário', 'Seus dados', 'Pronto'].map((nome, i) => (
            <span key={nome} className={passo === i + 1 ? 'font-semibold text-foreground' : ''}>
              {i + 1}. {nome}
            </span>
          ))}
        </div>

        {/* Opções Iniciais (Barbearia) */}
        {passo === 1 && tenant?.segmento === 'barbearia' && (
          <div className="flex gap-2 mb-4">
            <Button 
              variant={modo === 'agendamento' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setModo('agendamento')}
            >
              Agendar Horário
            </Button>
            <Button 
              variant={modo === 'fila' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setModo('fila')}
            >
              Entrar na Fila (Hoje)
            </Button>
          </div>
        )}

        {/* PASSO 1 — Serviço */}
        {passo === 1 && (

          <div className="grid gap-3 sm:grid-cols-2">
            {servicos.map((s) => (
              <Card
                key={s.id}
                onClick={() => { setServico(s); setPasso(2) }}
                className="cursor-pointer p-4 transition hover:border-primary"
              >
                <div className="font-medium">{s.nome}</div>
                <div className="text-sm text-muted-foreground">{s.duracao_minutos} min</div>
                <div className="mt-2 text-sm font-semibold">
                  R$ {(s.preco_centavos / 100).toFixed(2)}
                </div>
              </Card>
            ))}
            {servicos.length === 0 && (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                Nenhum serviço disponível.
              </p>
            )}
          </div>
        )}

        {/* PASSO 2 — Profissional */}
        {passo === 2 && (
          <div className="space-y-2">
            <Card
              onClick={() => { setProfissional('qualquer'); setPasso(3) }}
              className="cursor-pointer p-4 hover:border-primary"
            >
              <div className="font-medium">Sem preferência</div>
              <div className="text-sm text-muted-foreground">O sistema escolhe automaticamente.</div>
            </Card>
            {profissionais.map((p) => (
              <Card
                key={p.id}
                onClick={() => { setProfissional(p); setPasso(3) }}
                className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:border-primary"
              >
                <div className="flex items-center gap-3" onClick={() => { setProfissional(p); setPasso(3) }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {p.nome.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{p.nome}</div>
                    {p.especialidade && (
                      <div className="text-xs text-muted-foreground">{p.especialidade}</div>
                    )}
                  </div>
                </div>
                {tenant?.segmento === 'tatuagem' && p.id && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/portfolio/${(p as any).slug || p.id}`, '_blank');
                    }}
                  >
                    Ver Portfólio
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* PASSO 3 — Data e horário */}
        {passo === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Escolha o dia</Label>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {proximosDias.map((d) => (
                  <button
                    key={d.iso}
                    onClick={() => { setData(d.iso); setHora('') }}
                    className={`shrink-0 rounded border px-3 py-2 text-xs capitalize ${
                      data === d.iso ? 'border-primary bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {data && (
              <div>
                <Label>Horários disponíveis</Label>
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((s) => (
                    <button
                      key={s.hora}
                      disabled={!s.livre}
                      onClick={() => { setHora(s.hora); setPasso(4) }}
                      className={`rounded border px-2 py-2 text-sm ${
                        s.livre ? 'hover:border-primary' : 'cursor-not-allowed opacity-40 line-through'
                      }`}
                    >
                      {s.hora}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASSO 4 — Dados do cliente */}
        {passo === 4 && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" maxLength={100} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tel">Telefone (WhatsApp) *</Label>
              <Input id="tel" maxLength={30} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            {modo === 'agendamento' && (
              <>
                <div>
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input id="email" type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={aceitaLembretes} onCheckedChange={(v) => setAceitaLembretes(!!v)} />
                  Aceito receber lembretes via WhatsApp
                </label>
              </>
            )}
            
            {modo === 'agendamento' ? (
              <Button className="w-full" onClick={submeter} disabled={enviando}>
                {enviando ? 'Confirmando…' : 'Confirmar agendamento'}
              </Button>
            ) : (
              <Button className="w-full" onClick={entrarNaFila} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Entrar na Fila Agora'}
              </Button>
            )}
          </div>
        )}


        {/* PASSO 5 — Confirmação */}
        {passo === 5 && modo === 'agendamento' && resultado && servico && (
          <div className="space-y-4 text-center">
            <div className="text-4xl">{resultado.confirmacaoManual ? '⏳' : '✅'}</div>
            <h2 className="text-xl font-semibold">
              {resultado.confirmacaoManual
                ? 'Aguardando confirmação do estabelecimento'
                : 'Agendamento confirmado!'}
            </h2>
            <Card className="mx-auto max-w-sm p-4 text-left text-sm">
              <Linha r="Serviço" v={servico.nome} />
              <Linha r="Profissional" v={profissional && profissional !== 'qualquer' ? profissional.nome : 'Sem preferência'} />
              <Linha r="Data" v={new Date(`${data}T${hora}:00`).toLocaleString('pt-BR')} />
              <Linha r="Cliente" v={nome} />
            </Card>
            <p className="text-sm text-muted-foreground">
              Você receberá um lembrete 24h antes.
            </p>
            <a
              className="inline-block text-sm text-primary underline"
              href={montarLinkGoogleCalendar({
                titulo: `${servico.nome} — ${tenant.nome}`,
                inicio: new Date(`${data}T${hora}:00`),
                duracaoMin: servico.duracao_minutos,
              })}
              target="_blank"
              rel="noreferrer"
            >
              Adicionar ao Google Calendar
            </a>
          </div>
        )}

        {passo === 5 && modo === 'fila' && posicaoFila !== null && (
          <div className="space-y-4 text-center">
            <div className="text-6xl">🙌</div>
            <h2 className="text-2xl font-bold">Você está na fila!</h2>
            <div className="bg-primary/10 border-2 border-primary rounded-2xl p-8 max-w-xs mx-auto">
              <p className="text-sm text-primary font-bold uppercase tracking-widest mb-2">Sua Posição</p>
              <div className="text-7xl font-black text-primary">{posicaoFila}º</div>
            </div>
            <Card className="mx-auto max-w-sm p-4 text-left text-sm">
              <Linha r="Cliente" v={nome} />
              {servico && <Linha r="Serviço" v={servico.nome} />}
              <Linha r="Status" v="Aguardando" />
            </Card>
            <div className="p-4 bg-zinc-100 rounded-lg text-sm text-zinc-600">
              <p>Fique atento ao seu WhatsApp.</p>
              <p>Enviaremos um alerta quando faltarem 2 pessoas à sua frente.</p>
            </div>
          </div>
        )}


        {/* Voltar */}
        {passo > 1 && passo < 5 && (
          <Button variant="ghost" size="sm" onClick={() => setPasso((p) => (p - 1) as typeof passo)}>
            ← Voltar
          </Button>
        )}
      </main>
    </div>
  )
}

function Linha({ r, v }: { r: string; v: string }) {
  return (
    <div className="flex justify-between border-b py-1 last:border-0">
      <span className="text-muted-foreground">{r}</span>
      <span className="font-medium">{v}</span>
    </div>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      {children}
    </div>
  )
}

function montarLinkGoogleCalendar({
  titulo, inicio, duracaoMin,
}: { titulo: string; inicio: Date; duracaoMin: number }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${fmt(inicio)}/${fmt(fim)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default PaginaAgendamentoOnline
