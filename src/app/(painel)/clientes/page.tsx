// Painel: lista de clientes do tenant.
// Visualização em grade (padrão, estilo "Cascal") ou tabela.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClientes } from '@/hooks/useClientes'
import { useTenant } from '@/hooks/useTenant'
import { ModalCliente } from '@/componentes/clientes/ModalCliente'
import { iniciaisDoNome, mascararTelefone } from '@/lib/mascaras'
import { cn } from '@/lib/utils'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const PaginaClientes = () => {
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [mes, setMes] = useState<string>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [modo, setModo] = useState<'grade' | 'lista'>('grade')

  const { clientes, carregando, recarregar } = useClientes({
    busca,
    ativos: statusFiltro,
    mesAniversario: mes === 'todos' ? null : Number(mes),
  })

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Todos os clientes <span className="text-muted-foreground">({clientes.length.toLocaleString('pt-BR')})</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie sua base de clientes e acompanhe o histórico de cada um.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-card">
            <button
              onClick={() => setModo('grade')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                modo === 'grade' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
              aria-label="Visualizar em grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setModo('lista')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                modo === 'lista' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
              aria-label="Visualizar em lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-gradient-primary px-5 font-semibold shadow-elegant hover:opacity-90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-10 rounded-full border-transparent bg-muted/60 pl-9"
          />
        </div>

        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger className="h-10 w-40 rounded-full border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="h-10 w-48 rounded-full border-border">
            <SelectValue placeholder="Mês de aniversário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {MESES.map((m, idx) => (
              <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo */}
      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 rounded-2xl border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <UserRound className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Nenhum cliente encontrado</p>
            <p className="text-sm text-muted-foreground">Adicione seu primeiro cliente para começar.</p>
          </div>
          <Button
            onClick={() => setModalAberto(true)}
            className="rounded-full bg-gradient-primary shadow-elegant"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo cliente
          </Button>
        </Card>
      ) : modo === 'grade' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clientes.map((c) => (
            <Card
              key={c.id}
              onClick={() => navigate(`/painel/clientes/${c.id}`)}
              className="group cursor-pointer rounded-2xl border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-background shadow-card">
                  <AvatarFallback className="bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {iniciaisDoNome(c.nome) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{c.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.ativo ? 'Cliente ativo' : 'Inativo'}
                  </p>
                </div>
                {!c.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
              </div>

              <div className="mt-4 space-y-2 text-xs">
                {c.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{mascararTelefone(c.telefone)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/painel/clientes/${c.id}`) }}
                  className="flex items-center justify-between text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" /> Avaliações
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/painel/clientes/${c.id}`) }}
                  className="flex items-center justify-between text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Histórico
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/painel/clientes/${c.id}`)}
                >
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-primary text-xs font-bold text-primary-foreground">
                        {iniciaisDoNome(c.nome) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{mascararTelefone(c.telefone)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell>
                    {c.ativo ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/20">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ModalCliente
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        aoSalvar={() => recarregar()}
        tenantId={tenant?.id ?? null}
      />
    </div>
  )
}

export default PaginaClientes
