// Painel: lista de clientes do tenant.
// Busca em memória, filtros por status e mês de aniversário.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserRound } from 'lucide-react'
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

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const PaginaClientes = () => {
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [mes, setMes] = useState<string>('todos')
  const [modalAberto, setModalAberto] = useState(false)

  const { clientes, carregando, recarregar } = useClientes({
    busca,
    ativos: statusFiltro,
    mesAniversario: mes === 'todos' ? null : Number(mes),
  })

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} listados
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo cliente
        </Button>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Mês de aniversário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {MESES.map((m, idx) => (
              <SelectItem key={m} value={String(idx + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Último atendimento</TableHead>
              <TableHead>Visitas</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!carregando && clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserRound className="h-8 w-8 opacity-50" />
                    Nenhum cliente encontrado
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              clientes.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/painel/clientes/${c.id}`)}
                >
                  <TableCell>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{iniciaisDoNome(c.nome) || '?'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.nome}
                      {!c.ativo && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{mascararTelefone(c.telefone)}</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">0</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

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
