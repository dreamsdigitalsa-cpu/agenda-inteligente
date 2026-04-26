// Fluxo de onboarding pós-cadastro (6 etapas).
// Tela cheia, fora do LayoutPainel, com barra de progresso no topo.
// Cada etapa salva no banco ao avançar; o usuário pode pular qualquer etapa.
//
// Etapas:
// 1. Horário de funcionamento
// 2. Profissionais
// 3. Serviços
// 4. Identidade visual
// 5. Configurações específicas do segmento (NOVA — adapta por tipo de negócio)
// 6. Link público de agendamento
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Check, ChevronRight, Copy, Loader2, MessageCircle, Plus, SkipForward, Trash2, Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { SegmentoTenant } from '@/tipos/tenant'
// Componentes da etapa 5 (configurações específicas por segmento)
import EtapaBarbearia from '@/modulos/_onboarding-segmento/EtapaBarbearia'
import EtapaSalao from '@/modulos/_onboarding-segmento/EtapaSalao'
import EtapaEstetica from '@/modulos/_onboarding-segmento/EtapaEstetica'
import EtapaTatuagem from '@/modulos/_onboarding-segmento/EtapaTatuagem'
import EtapaManicure from '@/modulos/_onboarding-segmento/EtapaManicure'
import type { RefEtapaSegmento } from '@/modulos/_onboarding-segmento/tipos'

// ---------- Tipos locais ----------
interface HorarioDia {
  ativo: boolean
  abertura: string
  fechamento: string
}
interface ProfissionalForm {
  nome: string
  especialidade: string
  telefone: string
}
interface ServicoForm {
  nome: string
  duracaoMinutos: number
  precoReais: string
}

const DIAS = [
  { id: 'seg', nome: 'Segunda' },
  { id: 'ter', nome: 'Terça' },
  { id: 'qua', nome: 'Quarta' },
  { id: 'qui', nome: 'Quinta' },
  { id: 'sex', nome: 'Sexta' },
  { id: 'sab', nome: 'Sábado' },
  { id: 'dom', nome: 'Domingo' },
] as const

// Sugestões iniciais por segmento (apenas chute inicial — usuário pode editar)
const SUGESTOES_SERVICOS: Record<SegmentoTenant, ServicoForm[]> = {
  barbearia: [
    { nome: 'Corte', duracaoMinutos: 30, precoReais: '40' },
    { nome: 'Barba', duracaoMinutos: 30, precoReais: '30' },
    { nome: 'Corte + Barba', duracaoMinutos: 60, precoReais: '65' },
  ],
  salao: [
    { nome: 'Corte feminino', duracaoMinutos: 60, precoReais: '80' },
    { nome: 'Escova', duracaoMinutos: 45, precoReais: '60' },
    { nome: 'Coloração', duracaoMinutos: 120, precoReais: '180' },
  ],
  estetica: [
    { nome: 'Limpeza de pele', duracaoMinutos: 60, precoReais: '120' },
    { nome: 'Massagem relaxante', duracaoMinutos: 60, precoReais: '150' },
  ],
  tatuagem: [
    { nome: 'Sessão pequena', duracaoMinutos: 60, precoReais: '250' },
    { nome: 'Sessão média', duracaoMinutos: 180, precoReais: '600' },
  ],
  manicure: [
    { nome: 'Mão', duracaoMinutos: 45, precoReais: '40' },
    { nome: 'Pé', duracaoMinutos: 45, precoReais: '50' },
    { nome: 'Mão + Pé', duracaoMinutos: 90, precoReais: '80' },
  ],
}

const LIMITE_FREEMIUM_PROFISSIONAIS = 2
const LIMITE_MAX_PROFISSIONAIS = 10
const TOTAL_ETAPAS = 6

// Gera um slug a partir do nome do estabelecimento (sem acentos, kebab-case)
function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'meu-estabelecimento'
}

const PaginaOnboarding = () => {
  const navegar = useNavigate()
  const { tenant, carregando: carregandoTenant } = useTenant()

  const [etapa, setEtapa] = useState(1)
  const [salvando, setSalvando] = useState(false)

  // Etapa 1 — horário
  const [horarios, setHorarios] = useState<Record<string, HorarioDia>>(() =>
    Object.fromEntries(DIAS.map((d) => [d.id, { ativo: false, abertura: '09:00', fechamento: '18:00' }]))
  )

  // Etapa 2 — profissionais
  const [profissionais, setProfissionais] = useState<ProfissionalForm[]>([
    { nome: '', especialidade: '', telefone: '' },
  ])
  const [modalUpgradeAberto, setModalUpgradeAberto] = useState(false)

  // Etapa 3 — serviços
  const [servicos, setServicos] = useState<ServicoForm[]>([
    { nome: '', duracaoMinutos: 30, precoReais: '' },
  ])

  // Etapa 4 — identidade
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [corPrincipal, setCorPrincipal] = useState('#7c3aed')
  const [endereco, setEndereco] = useState('')

  // Etapa 5 — configurações específicas do segmento (ref para chamar save())
  const refSegmento = useRef<RefEtapaSegmento>(null)

  // Etapa 6 — slug derivado do nome do tenant
  const slug = useMemo(() => (tenant ? gerarSlug(tenant.nome) : ''), [tenant])
  const linkCompleto = `${window.location.origin}/agendar/${slug}`

  // Carrega sugestões de serviço quando o tenant ficar disponível
  useEffect(() => {
    if (tenant && servicos.length === 1 && !servicos[0].nome) {
      setServicos(SUGESTOES_SERVICOS[tenant.segmento])
    }
  }, [tenant]) // eslint-disable-line react-hooks/exhaustive-deps

  // Confetti ao chegar na última etapa (link público)
  useEffect(() => {
    if (etapa === TOTAL_ETAPAS) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 } })
    }
  }, [etapa])

  // ---------- Handlers de salvamento por etapa ----------
  const salvarHorario = async () => {
    if (!tenant) return
    const { error } = await supabase
      .from('configuracoes_tenant')
      .upsert(
        { tenant_id: tenant.id, horario_funcionamento: horarios as never },
        { onConflict: 'tenant_id' }
      )
    if (error) throw error
  }

  const salvarProfissionais = async () => {
    if (!tenant) return
    const validos = profissionais.filter((p) => p.nome.trim())
    if (!validos.length) return
    const { error } = await supabase
      .from('profissionais')
      .insert(validos.map((p) => ({
        tenant_id: tenant.id,
        nome: p.nome.trim(),
        especialidade: p.especialidade.trim() || null,
        telefone: p.telefone.trim() || null,
      })))
    if (error) throw error
  }

  const salvarServicos = async () => {
    if (!tenant) return
    const validos = servicos.filter((s) => s.nome.trim())
    if (!validos.length) return
    const { error } = await supabase
      .from('servicos')
      .insert(validos.map((s) => ({
        tenant_id: tenant.id,
        nome: s.nome.trim(),
        duracao_minutos: s.duracaoMinutos,
        preco_centavos: Math.round((parseFloat(s.precoReais.replace(',', '.')) || 0) * 100),
      })))
    if (error) throw error
  }

  const salvarIdentidade = async () => {
    if (!tenant) return
    let logoUrl: string | null = null
    if (logoFile) {
      const ext = logoFile.name.split('.').pop() ?? 'png'
      const caminho = `${tenant.id}/logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(caminho, logoFile, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('logos').getPublicUrl(caminho)
      logoUrl = data.publicUrl
    }
    const payload: Record<string, unknown> = {
      tenant_id: tenant.id,
      cor_principal: corPrincipal,
      endereco: endereco.trim() || null,
    }
    if (logoUrl) payload.logo_url = logoUrl

    const { error } = await supabase
      .from('configuracoes_tenant')
      .upsert(payload as never, { onConflict: 'tenant_id' })
    if (error) throw error

    // Garante slug no tenant para o link público
    if (slug) {
      await supabase.from('tenants').update({ slug }).eq('id', tenant.id)
    }
  }

  // ---------- Avanço de etapas ----------
  const avancar = async (pular = false) => {
    if (etapa === TOTAL_ETAPAS) {
      navegar('/painel/agenda')
      return
    }
    setSalvando(true)
    try {
      if (!pular) {
        if (etapa === 1) await salvarHorario()
        if (etapa === 2) await salvarProfissionais()
        if (etapa === 3) await salvarServicos()
        if (etapa === 4) await salvarIdentidade()
        // Etapa 5: dispara o save() do componente do segmento via ref.
        // Cada componente cuida do upsert em configuracoes_segmento.
        if (etapa === 5 && refSegmento.current) {
          await refSegmento.current.save()
        }
      }
      setEtapa((e) => e + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar etapa.')
    } finally {
      setSalvando(false)
    }
  }

  // ---------- Helpers UI ----------
  const adicionarProfissional = () => {
    const limite = tenant?.plano === 'freemium' ? LIMITE_FREEMIUM_PROFISSIONAIS : LIMITE_MAX_PROFISSIONAIS
    if (profissionais.length >= limite) {
      if (tenant?.plano === 'freemium') setModalUpgradeAberto(true)
      else toast.info(`Limite de ${LIMITE_MAX_PROFISSIONAIS} profissionais atingido.`)
      return
    }
    setProfissionais([...profissionais, { nome: '', especialidade: '', telefone: '' }])
  }

  const copiarLink = async () => {
    await navigator.clipboard.writeText(linkCompleto)
    toast.success('Link copiado!')
  }

  const compartilharWhatsapp = () => {
    const msg = encodeURIComponent(`Agende seu horário aqui: ${linkCompleto}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (carregandoTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const progresso = (etapa / TOTAL_ETAPAS) * 100

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Barra de progresso */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Etapa {etapa} de {TOTAL_ETAPAS}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progresso)}%</span>
          </div>
          <Progress value={progresso} className="h-2" />
          <div className="flex justify-between mt-3">
            {Array.from({ length: TOTAL_ETAPAS }).map((_, i) => {
              const n = i + 1
              const concluida = n < etapa
              const atual = n === etapa
              return (
                <div
                  key={n}
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    concluida
                      ? 'bg-primary text-primary-foreground'
                      : atual
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {concluida ? <Check className="h-4 w-4" /> : n}
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={etapa}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {etapa === 1 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Quando você atende?</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Marque os dias e ajuste os horários de funcionamento.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {DIAS.map((d) => {
                      const h = horarios[d.id]
                      return (
                        <div key={d.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-md border">
                          <Checkbox
                            id={`dia-${d.id}`}
                            checked={h.ativo}
                            onCheckedChange={(v) =>
                              setHorarios({ ...horarios, [d.id]: { ...h, ativo: !!v } })
                            }
                          />
                          <Label htmlFor={`dia-${d.id}`} className="w-20 sm:w-24 cursor-pointer">
                            {d.nome}
                          </Label>
                          <div className="flex items-center gap-2 ml-auto">
                            <Input
                              type="time"
                              value={h.abertura}
                              disabled={!h.ativo}
                              onChange={(e) =>
                                setHorarios({ ...horarios, [d.id]: { ...h, abertura: e.target.value } })
                              }
                              className="w-28"
                            />
                            <span className="text-muted-foreground">às</span>
                            <Input
                              type="time"
                              value={h.fechamento}
                              disabled={!h.ativo}
                              onChange={(e) =>
                                setHorarios({ ...horarios, [d.id]: { ...h, fechamento: e.target.value } })
                              }
                              className="w-28"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {etapa === 2 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Quem trabalha com você?</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cadastre os profissionais do seu estabelecimento.
                      {tenant?.plano === 'freemium' && (
                        <> Plano gratuito permite até {LIMITE_FREEMIUM_PROFISSIONAIS}.</>
                      )}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {profissionais.map((p, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 rounded-md border">
                        <Input
                          placeholder="Nome"
                          value={p.nome}
                          onChange={(e) => {
                            const novo = [...profissionais]
                            novo[i].nome = e.target.value
                            setProfissionais(novo)
                          }}
                        />
                        <Input
                          placeholder="Especialidade"
                          value={p.especialidade}
                          onChange={(e) => {
                            const novo = [...profissionais]
                            novo[i].especialidade = e.target.value
                            setProfissionais(novo)
                          }}
                        />
                        <Input
                          placeholder="Telefone"
                          value={p.telefone}
                          onChange={(e) => {
                            const novo = [...profissionais]
                            novo[i].telefone = e.target.value
                            setProfissionais(novo)
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setProfissionais(profissionais.filter((_, j) => j !== i))}
                          disabled={profissionais.length === 1}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={adicionarProfissional} className="w-full">
                    <Plus className="h-4 w-4" /> Adicionar mais um profissional
                  </Button>
                </CardContent>
              </Card>
            )}

            {etapa === 3 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Quais serviços você oferece?</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sugerimos alguns serviços comuns. Edite, remova ou adicione novos.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {servicos.map((s, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_auto] gap-2 p-3 rounded-md border">
                        <Input
                          placeholder="Nome do serviço"
                          value={s.nome}
                          onChange={(e) => {
                            const novo = [...servicos]
                            novo[i].nome = e.target.value
                            setServicos(novo)
                          }}
                        />
                        <Select
                          value={String(s.duracaoMinutos)}
                          onValueChange={(v) => {
                            const novo = [...servicos]
                            novo[i].duracaoMinutos = Number(v)
                            setServicos(novo)
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                              <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="R$ 0,00"
                          inputMode="decimal"
                          value={s.precoReais}
                          onChange={(e) => {
                            const novo = [...servicos]
                            novo[i].precoReais = e.target.value
                            setServicos(novo)
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setServicos(servicos.filter((_, j) => j !== i))}
                          disabled={servicos.length === 1}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setServicos([...servicos, { nome: '', duracaoMinutos: 30, precoReais: '' }])}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4" /> Adicionar serviço
                  </Button>
                </CardContent>
              </Card>
            )}

            {etapa === 4 && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Como é o seu estabelecimento?</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Personalize a aparência da sua agenda e do link público.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null
                          setLogoFile(f)
                          setLogoPreview(f ? URL.createObjectURL(f) : null)
                        }}
                        className="max-w-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor principal</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={corPrincipal}
                        onChange={(e) => setCorPrincipal(e.target.value)}
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <Input
                        value={corPrincipal}
                        onChange={(e) => setCorPrincipal(e.target.value)}
                        className="max-w-[140px] font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço completo</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua, número, bairro, cidade"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {etapa === 5 && tenant && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  {tenant.segmento === 'barbearia' && <EtapaBarbearia ref={refSegmento} />}
                  {tenant.segmento === 'salao'     && <EtapaSalao     ref={refSegmento} />}
                  {tenant.segmento === 'estetica'  && <EtapaEstetica  ref={refSegmento} />}
                  {tenant.segmento === 'tatuagem'  && <EtapaTatuagem  ref={refSegmento} />}
                  {tenant.segmento === 'manicure'  && <EtapaManicure  ref={refSegmento} />}
                </CardContent>
              </Card>
            )}

            {etapa === 6 && (
              <Card>
                <CardContent className="p-6 space-y-6 text-center">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold">
                      Seu link de agendamento está pronto! 🎉
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Compartilhe com seus clientes para que eles agendem online.
                    </p>
                  </div>

                  <div className="bg-muted rounded-md p-4 break-all font-mono text-sm">
                    {linkCompleto}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button variant="outline" onClick={copiarLink}>
                      <Copy className="h-4 w-4" /> Copiar link
                    </Button>
                    <Button variant="outline" onClick={compartilharWhatsapp}>
                      <MessageCircle className="h-4 w-4" /> Compartilhar no WhatsApp
                    </Button>
                  </div>

                  <Button size="lg" className="w-full" onClick={() => navegar('/painel/agenda')}>
                    Ir para minha agenda <ChevronRight className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Rodapé fixo de navegação (não aparece na última etapa) */}
        {etapa < TOTAL_ETAPAS && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={() => avancar(true)} disabled={salvando}>
              Pular por agora
            </Button>
            <Button onClick={() => avancar(false)} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Próximo <ChevronRight className="h-4 w-4" /></>}
            </Button>
          </div>
        )}
      </main>

      {/* Modal de upgrade */}
      <Dialog open={modalUpgradeAberto} onOpenChange={setModalUpgradeAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limite do plano gratuito atingido</DialogTitle>
            <DialogDescription>
              O plano Freemium permite cadastrar até {LIMITE_FREEMIUM_PROFISSIONAIS} profissionais.
              Faça o upgrade para o plano Profissional e cadastre até {LIMITE_MAX_PROFISSIONAIS}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalUpgradeAberto(false)}>
              Continuar no gratuito
            </Button>
            <Button onClick={() => navegar('/painel/assinatura')}>
              Ver planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PaginaOnboarding
