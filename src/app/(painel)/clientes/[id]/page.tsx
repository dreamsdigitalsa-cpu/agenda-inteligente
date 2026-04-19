// Painel: detalhe de um cliente.
// Histórico, estatísticas e agendamentos futuros virão da tabela `agendamentos` (a ser criada).
// Por ora exibimos estado vazio nessas seções.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ModalCliente } from '@/componentes/clientes/ModalCliente'
import { atualizarCliente, buscarClientePorId } from '@/hooks/useClientes'
import { usePermissao } from '@/hooks/usePermissao'
import { useTenant } from '@/hooks/useTenant'
import { iniciaisDoNome, mascararTelefone } from '@/lib/mascaras'
import { PERMISSOES } from '@/lib/constantes/permissoes'
import type { Cliente } from '@/tipos/cliente'

const PaginaDetalheCliente = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const { ehAdmin } = usePermissao()
  // PERM-007: ver histórico/valores. Enquanto não há sistema granular, admin sempre pode.
  const podeVerValores = ehAdmin

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [editar, setEditar] = useState(false)
  const [obsLocal, setObsLocal] = useState('')
  const [salvandoObs, setSalvandoObs] = useState(false)

  async function recarregar() {
    if (!id) return
    setCarregando(true)
    try {
      const c = await buscarClientePorId(id)
      setCliente(c)
      setObsLocal(c?.observacoes ?? '')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar cliente')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function salvarObservacoes() {
    if (!cliente) return
    setSalvandoObs(true)
    try {
      const atualizado = await atualizarCliente(cliente.id, { observacoes: obsLocal })
      setCliente(atualizado)
      toast.success('Observações salvas')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvandoObs(false)
    }
  }

  if (carregando) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
  }
  if (!cliente) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/painel/clientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Cliente não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/painel/clientes')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {/* Cabeçalho */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg">{iniciaisDoNome(cliente.nome)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
              {!cliente.ativo && <Badge variant="secondary">Inativo</Badge>}
              {cliente.temConta && <Badge>Tem conta</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{mascararTelefone(cliente.telefone)}</p>
            {cliente.email && <p className="text-sm text-muted-foreground">{cliente.email}</p>}
            {cliente.dataNascimento && (
              <p className="text-sm text-muted-foreground">
                Nasc.: {new Date(cliente.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditar(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button
              onClick={() =>
                navigate(`/painel/agenda?novo=1&clienteId=${cliente.id}`)
              }
            >
              <CalendarPlus className="mr-2 h-4 w-4" /> Agendar agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de visitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{podeVerValores ? 'R$ 0,00' : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Último serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {podeVerValores
              ? 'Nenhum atendimento registrado ainda. Os atendimentos aparecerão aqui após a integração com a agenda.'
              : `Você não tem permissão para visualizar o histórico (${PERMISSOES.VER_HISTORICO_CLIENTE}).`}
          </p>
        </CardContent>
      </Card>

      {/* Próximos agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos futuros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
        </CardContent>
      </Card>

      {/* Observações internas */}
      <Card>
        <CardHeader>
          <CardTitle>Observações internas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={obsLocal}
            onChange={(e) => setObsLocal(e.target.value)}
            rows={4}
            placeholder="Anotações visíveis apenas pela equipe"
          />
          <div className="flex justify-end">
            <Button
              onClick={salvarObservacoes}
              disabled={salvandoObs || obsLocal === (cliente.observacoes ?? '')}
            >
              {salvandoObs ? 'Salvando...' : 'Salvar observações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModalCliente
        aberto={editar}
        aoFechar={() => setEditar(false)}
        aoSalvar={(c) => setCliente(c)}
        tenantId={tenant?.id ?? null}
        cliente={cliente}
      />
    </div>
  )
}

export default PaginaDetalheCliente
