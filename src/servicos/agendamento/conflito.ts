// Serviço: detectar conflito de horário entre agendamentos
// do mesmo profissional no mesmo intervalo.
export interface IntervaloAgendamento {
  profissionalId: string
  inicioEm: Date
  fimEm: Date
}

export async function existeConflito(
  _intervalo: IntervaloAgendamento
): Promise<boolean> {
  throw new Error('existeConflito: não implementado')
}
