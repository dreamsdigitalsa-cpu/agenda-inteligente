// Drawer lateral com detalhes do agendamento e ações de mudança de status.
// Permissões:
// - Cancelar com menos de 2h: PERM-008
// - Cancelar geral / excluir: PERM-001
// - Editar agendamento de outro profissional: PERM-002
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/cliente'
import { usePermissao } from '@/hooks/usePermissao'
import { toast } from 'sonner'
import type { AgendamentoDetalhado } from '@/hooks/useAgenda'

interface Props {
  agendamento: AgendamentoDetalhado | null
  onFechar: () => void
}

export function DrawerDetalhesAgendamento({ agendamento, onFechar }: Props) {
  const { temPermissao } = usePermissao()

  if (!agendamento) return null

  const inicio = new Date(agendamento.data_hora_inicio)
  const fim = new Date(agendamento.data_hora_fim)
  const minutosAteInicio = (inicio.getTime() - Date.now()) / 60_000

  // Lógica de permissão de cancelamento:
  // - >= 2h até início: PERM-001 (cancelar normal)
  // - < 2h até início: PERM-008 (cancelar de curto prazo)
  const podeCancelar =
    minutosAteInicio < 120 ? temPermissao('PERM-008') : temPermissao('PERM-001')

  const mudarStatus = async (novo: AgendamentoDetalhado['status']) => {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: novo })
      .eq('id', agendamento.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Status atualizado: ${novo.replace('_', ' ')}`)
    if (novo === 'concluido') {
      // TODO: abrir modal de lançamento financeiro
      toast.message('Abra o caixa para lançar o pagamento.')
    }
    onFechar()
  }

  return (
    <Sheet open={!!agendamento} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalhes do agendamento</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3 text-sm">
          <Linha rotulo="Cliente" valor={agendamento.cliente_nome ?? '—'} />
          <Linha rotulo="Profissional" valor={agendamento.profissional_nome ?? '—'} />
          <Linha rotulo="Serviço" valor={agendamento.servico_nome ?? '—'} />
          <Linha
            rotulo="Início"
            valor={inicio.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          />
          <Linha rotulo="Fim" valor={fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} />
          <Linha rotulo="Status" valor={agendamento.status.replace('_', ' ')} />
          <Linha rotulo="Origem" valor={agendamento.origem} />
          {agendamento.observacoes && <Linha rotulo="Obs" valor={agendamento.observacoes} />}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {agendamento.status === 'agendado' && (
            <Button onClick={() => mudarStatus('confirmado')}>Confirmar</Button>
          )}
          {(agendamento.status === 'agendado' || agendamento.status === 'confirmado') && (
            <Button variant="secondary" onClick={() => mudarStatus('em_atendimento')}>
              Iniciar atendimento
            </Button>
          )}
          {agendamento.status === 'em_atendimento' && (
            <Button onClick={() => mudarStatus('concluido')}>Concluir</Button>
          )}

          <Button
            variant="outline"
            disabled={!temPermissao('PERM-002')}
            title={!temPermissao('PERM-002') ? 'Requer PERM-002' : undefined}
            className={!temPermissao('PERM-002') ? 'opacity-50' : ''}
          >
            Editar
          </Button>

          <Button
            variant="destructive"
            disabled={!podeCancelar || agendamento.status === 'cancelado'}
            className={!podeCancelar ? 'opacity-50' : ''}
            title={
              !podeCancelar
                ? minutosAteInicio < 120
                  ? 'Requer PERM-008 (curto prazo)'
                  : 'Requer PERM-001'
                : undefined
            }
            onClick={() => mudarStatus('cancelado')}
          >
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between border-b py-1">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-medium capitalize">{valor}</span>
    </div>
  )
}
