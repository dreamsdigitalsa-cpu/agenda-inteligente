// Serviço: cancelar agendamento.
// Verifica permissão PERM-008 quando o cancelamento é de curto prazo.
export async function cancelarAgendamento(
  _agendamentoId: string,
  _motivo?: string
): Promise<void> {
  throw new Error('cancelarAgendamento: não implementado')
}
