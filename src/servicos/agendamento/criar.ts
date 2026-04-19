// Serviço: criar agendamento.
// Deve validar conflito antes de persistir (ver ./conflito.ts).
import type { Agendamento } from '../../tipos/agendamento'

export async function criarAgendamento(
  _dados: Omit<Agendamento, 'id' | 'status'>
): Promise<Agendamento> {
  throw new Error('criarAgendamento: não implementado')
}
