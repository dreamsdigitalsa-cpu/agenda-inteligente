// Tipos do domínio de agendamento
export type StatusAgendamento =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'faltou'

export interface Agendamento {
  id: string
  tenantId: string
  clienteId: string
  profissionalId: string
  servicoId: string
  inicioEm: string
  fimEm: string
  status: StatusAgendamento
  observacoes?: string
}
