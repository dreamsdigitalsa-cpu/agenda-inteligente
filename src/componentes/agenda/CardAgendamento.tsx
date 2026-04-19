// Card visual de um agendamento (usado nas grades dia/semana).
// Cor depende do status. Cancelado fica riscado.
import type { AgendamentoDetalhado } from '@/hooks/useAgenda'

const corPorStatus: Record<AgendamentoDetalhado['status'], string> = {
  agendado: 'bg-blue-100 text-blue-900 border-blue-300',
  confirmado: 'bg-green-100 text-green-900 border-green-300',
  em_atendimento: 'bg-orange-100 text-orange-900 border-orange-300',
  concluido: 'bg-gray-200 text-gray-700 border-gray-300',
  cancelado: 'bg-red-100 text-red-900 border-red-300 line-through opacity-70',
  faltou: 'bg-red-50 text-red-800 border-red-200 italic',
}

interface Props {
  agendamento: AgendamentoDetalhado
  compacto?: boolean
  onClick: () => void
}

export function CardAgendamento({ agendamento, compacto, onClick }: Props) {
  const inicio = new Date(agendamento.data_hora_inicio)
  const hora = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return (
    <button
      onClick={onClick}
      className={`w-full rounded border px-2 py-1 text-left text-xs transition hover:shadow ${corPorStatus[agendamento.status]}`}
    >
      {compacto ? (
        <span className="block truncate font-medium">{agendamento.cliente_nome ?? '—'}</span>
      ) : (
        <>
          <div className="truncate font-medium">{agendamento.cliente_nome ?? '—'}</div>
          <div className="truncate opacity-80">{agendamento.servico_nome ?? '—'}</div>
          <div className="opacity-70">{hora}</div>
        </>
      )}
    </button>
  )
}
