// Página de preview interativo do sistema.
// Carrega o seed do segmento informado na URL e permite navegar entre as
// telas (Agenda, Clientes, Serviços, Financeiro) operando em estado local.
// IMPORTANTE: nenhuma chamada ao Supabase é feita aqui.
import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Calendar,
  Users,
  Scissors,
  DollarSign,
  Settings,
  Plus,
  Search,
  Sparkles,
  Clock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { seedBarbearia } from '@/modulos/barbearia/demo/seed'
import { seedSalao } from '@/modulos/salao/demo/seed'
import { seedEstetica } from '@/modulos/estetica/demo/seed'
import { seedTatuagem } from '@/modulos/tatuagem/demo/seed'
import { seedManicure } from '@/modulos/manicure/demo/seed'
import type {
  SeedDemo,
  SegmentoDemo,
  AgendamentoDemo,
  ClienteDemo,
  ServicoDemo,
} from '@/tipos/demo'

// Mapa segmento → seed correspondente.
const SEEDS: Record<SegmentoDemo, SeedDemo> = {
  barbearia: seedBarbearia,
  salao: seedSalao,
  estetica: seedEstetica,
  tatuagem: seedTatuagem,
  manicure: seedManicure,
}

type TelaDemo = 'agenda' | 'clientes' | 'servicos' | 'financeiro' | 'configuracoes'

const PreviewDemo = () => {
  const { segmento } = useParams<{ segmento: string }>()
  const seed = useMemo<SeedDemo | null>(() => {
    if (!segmento || !(segmento in SEEDS)) return null
    return SEEDS[segmento as SegmentoDemo]
  }, [segmento])

  // Segmento desconhecido: mostra fallback amigável.
  if (!seed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Segmento não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O segmento "{segmento}" não está disponível para demonstração.
            </p>
            <Button asChild>
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <PreviewConteudo seed={seed} />
}

// Conteúdo principal — renderizado apenas quando o seed existe.
const PreviewConteudo = ({ seed }: { seed: SeedDemo }) => {
  const [tela, setTela] = useState<TelaDemo>('agenda')
  const [agendamentos, setAgendamentos] = useState<AgendamentoDemo[]>(seed.agendamentos)
  const [clientes, setClientes] = useState<ClienteDemo[]>(seed.clientes)
  const [servicos, setServicos] = useState<ServicoDemo[]>(seed.servicos)

  const linkCadastro = `/cadastro?segmento=${seed.segmento}`

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* 1) Banner fixo de modo demonstração */}
      <div className="sticky top-0 z-40 bg-amber-100 border-b border-amber-200 text-amber-900">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-sm">
          <p className="truncate">
            🎯 <strong>Modo demonstração</strong> — Você está explorando o sistema com dados
            fictícios. Nada é salvo.
          </p>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
            <Link to={linkCadastro}>Criar conta grátis →</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* 2) Sidebar de navegação */}
        <SidebarDemo
          nomeEstabelecimento={seed.estabelecimento.nome}
          telaAtiva={tela}
          aoTrocar={setTela}
        />

        {/* 3) Conteúdo da tela ativa */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {tela === 'agenda' && (
            <TelaAgenda
              seed={seed}
              agendamentos={agendamentos}
              clientes={clientes}
              servicos={servicos}
              aoCriar={(novo) => setAgendamentos((atual) => [...atual, novo])}
            />
          )}
          {tela === 'clientes' && (
            <TelaClientes
              clientes={clientes}
              aoCriar={(novo) => setClientes((atual) => [...atual, novo])}
            />
          )}
          {tela === 'servicos' && (
            <TelaServicos
              servicos={servicos}
              aoAtualizarPreco={(id, preco) =>
                setServicos((atual) =>
                  atual.map((s) => (s.id === id ? { ...s, preco } : s)),
                )
              }
            />
          )}
          {tela === 'financeiro' && <TelaFinanceiro seed={seed} />}
          {tela === 'configuracoes' && <TelaConfiguracoes seed={seed} />}
        </main>
      </div>

      {/* 4) CTA flutuante */}
      <Link
        to={linkCadastro}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium"
      >
        <Sparkles className="w-4 h-4" />
        Gostou? Crie sua conta grátis
      </Link>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

const ITENS_MENU: { tela: TelaDemo; label: string; Icone: typeof Calendar }[] = [
  { tela: 'agenda', label: 'Agenda', Icone: Calendar },
  { tela: 'clientes', label: 'Clientes', Icone: Users },
  { tela: 'servicos', label: 'Serviços', Icone: Scissors },
  { tela: 'financeiro', label: 'Financeiro', Icone: DollarSign },
  { tela: 'configuracoes', label: 'Configurações', Icone: Settings },
]

const SidebarDemo = ({
  nomeEstabelecimento,
  telaAtiva,
  aoTrocar,
}: {
  nomeEstabelecimento: string
  telaAtiva: TelaDemo
  aoTrocar: (t: TelaDemo) => void
}) => (
  <aside className="w-56 shrink-0 bg-card border-r hidden md:flex flex-col">
    <div className="p-4 border-b">
      <p className="text-xs text-muted-foreground">Estabelecimento</p>
      <p className="font-semibold truncate">{nomeEstabelecimento}</p>
    </div>
    <nav className="flex-1 p-2 space-y-1">
      {ITENS_MENU.map(({ tela, label, Icone }) => (
        <button
          key={tela}
          onClick={() => aoTrocar(tela)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            telaAtiva === tela
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-foreground'
          }`}
        >
          <Icone className="w-4 h-4" />
          {label}
        </button>
      ))}
    </nav>
    <div className="p-3 border-t">
      <span className="inline-block text-[10px] font-semibold tracking-wider px-2 py-1 rounded bg-amber-100 text-amber-800">
        DEMO
      </span>
    </div>
  </aside>
)

/* -------------------------------------------------------------------------- */
/* Tela: Agenda                                                                */
/* -------------------------------------------------------------------------- */

const TelaAgenda = ({
  seed,
  agendamentos,
  clientes,
  servicos,
  aoCriar,
}: {
  seed: SeedDemo
  agendamentos: AgendamentoDemo[]
  clientes: ClienteDemo[]
  servicos: ServicoDemo[]
  aoCriar: (novo: AgendamentoDemo) => void
}) => {
  const [aberto, setAberto] = useState(false)
  const [hora, setHora] = useState('15:00')
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '')
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? '')
  const [profissionalId, setProfissionalId] = useState(seed.profissionais[0]?.id ?? '')

  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
  const nomeServico = (id: string) => servicos.find((s) => s.id === id)?.nome ?? '—'
  const nomeProfissional = (id: string) =>
    seed.profissionais.find((p) => p.id === id)?.nome ?? '—'

  const salvar = () => {
    aoCriar({
      id: `a${Date.now()}`,
      clienteId,
      servicoId,
      profissionalId,
      data: 'hoje',
      hora,
      status: 'agendado',
    })
    toast.success('Agendamento criado! (modo demo)')
    setAberto(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda de hoje</h1>
          <p className="text-sm text-muted-foreground">
            {agendamentos.length} agendamento(s) programados
          </p>
        </div>
        <Button onClick={() => setAberto(true)}>
          <Plus className="w-4 h-4" /> Novo agendamento
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {agendamentos
            .slice()
            .sort((a, b) => a.hora.localeCompare(b.hora))
            .map((ag) => (
              <Card key={ag.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-center w-16 shrink-0">
                    <p className="text-2xl font-bold">{ag.hora}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">hoje</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{nomeCliente(ag.clienteId)}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {nomeServico(ag.servicoId)} • {nomeProfissional(ag.profissionalId)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      ag.status === 'confirmado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {ag.status}
                  </span>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Painel lateral: fila de espera (apenas barbearia) */}
        {seed.filaDeEspera && seed.filaDeEspera.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Fila de espera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {seed.filaDeEspera.map((f) => (
                <div key={f.posicao} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                    {f.posicao}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.nome}</p>
                    <p className="text-xs text-muted-foreground">{f.servico}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{f.espera}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de criação */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <CampoSelect label="Cliente" value={clienteId} onChange={setClienteId}
              options={clientes.map((c) => ({ value: c.id, label: c.nome }))} />
            <CampoSelect label="Serviço" value={servicoId} onChange={setServicoId}
              options={servicos.map((s) => ({ value: s.id, label: s.nome }))} />
            <CampoSelect label="Profissional" value={profissionalId} onChange={setProfissionalId}
              options={seed.profissionais.map((p) => ({ value: p.id, label: p.nome }))} />
            <div>
              <label className="text-sm font-medium">Horário</label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper de select nativo estilizado.
const CampoSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Tela: Clientes                                                              */
/* -------------------------------------------------------------------------- */

const TelaClientes = ({
  clientes,
  aoCriar,
}: {
  clientes: ClienteDemo[]
  aoCriar: (c: ClienteDemo) => void
}) => {
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<ClienteDemo | null>(null)
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()),
  )

  const salvar = () => {
    if (!nome.trim()) return
    aoCriar({
      id: `c${Date.now()}`,
      nome,
      telefone,
      ultimaVisita: new Date().toISOString().slice(0, 10),
    })
    toast.success('Cliente cadastrado! (modo demo)')
    setNome('')
    setTelefone('')
    setAberto(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setAberto(true)}>
          <Plus className="w-4 h-4" /> Novo cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {filtrados.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-colors ${
                selecionado?.id === c.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelecionado(c)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.nome}</p>
                  <p className="text-sm text-muted-foreground">{c.telefone}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Última visita: {c.ultimaVisita}
                </p>
              </CardContent>
            </Card>
          ))}
          {filtrados.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          )}
        </div>

        {selecionado && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selecionado.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Telefone:</strong> {selecionado.telefone}</p>
              <p><strong>Última visita:</strong> {selecionado.ultimaVisita}</p>
              <div>
                <p className="font-medium mb-1">Histórico</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Atendimento em {selecionado.ultimaVisita}</li>
                  <li>• Atendimento em 2025-03-20</li>
                  <li>• Atendimento em 2025-02-15</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Tela: Serviços                                                              */
/* -------------------------------------------------------------------------- */

const TelaServicos = ({
  servicos,
  aoAtualizarPreco,
}: {
  servicos: ServicoDemo[]
  aoAtualizarPreco: (id: string, preco: number) => void
}) => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">Serviços</h1>
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicos.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nome}</TableCell>
                <TableCell>{s.duracao} min</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={s.preco}
                    onChange={(e) => aoAtualizarPreco(s.id, Number(e.target.value))}
                    className="w-28"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Tela: Financeiro                                                            */
/* -------------------------------------------------------------------------- */

const TelaFinanceiro = ({ seed }: { seed: SeedDemo }) => {
  // Gera 7 valores fictícios baseados no ticket médio para o gráfico de barras.
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const valores = useMemo(
    () => dias.map(() => Math.round(seed.financeiro.ticketMedio * (2 + Math.random() * 4))),
    [seed.financeiro.ticketMedio],
  )
  const max = Math.max(...valores)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <CardResumo titulo="Receita hoje" valor={seed.financeiro.receitaHoje} />
        <CardResumo titulo="Receita do mês" valor={seed.financeiro.receitaMes} />
        <CardResumo titulo="Ticket médio" valor={seed.financeiro.ticketMedio} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-48">
            {valores.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary/80 rounded-t"
                  style={{ height: `${(v / max) * 100}%` }}
                  title={`R$ ${v}`}
                />
                <span className="text-xs text-muted-foreground">{dias[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        Relatórios completos disponíveis na versão completa.
      </p>
    </div>
  )
}

const CardResumo = ({ titulo, valor }: { titulo: string; valor: number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-bold mt-1">
        R$ {valor.toLocaleString('pt-BR')}
      </p>
    </CardContent>
  </Card>
)

/* -------------------------------------------------------------------------- */
/* Tela: Configurações                                                         */
/* -------------------------------------------------------------------------- */

const TelaConfiguracoes = ({ seed }: { seed: SeedDemo }) => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">Configurações</h1>
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados do estabelecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium">Nome</label>
          <Input defaultValue={seed.estabelecimento.nome} />
        </div>
        <div>
          <label className="text-sm font-medium">Segmento</label>
          <Input defaultValue={seed.segmento} disabled />
        </div>
        <p className="text-xs text-muted-foreground italic">
          Configurações avançadas disponíveis na versão completa.
        </p>
      </CardContent>
    </Card>
  </div>
)

export default PreviewDemo
