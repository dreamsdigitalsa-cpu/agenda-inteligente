// Serviço: verificação de limites do plano contratado pelo tenant.
// Ex.: nº de profissionais, agendamentos/mês, mensagens enviadas.
export async function dentroDoLimite(
  _tenantId: string,
  _recurso: string
): Promise<boolean> {
  throw new Error('dentroDoLimite: não implementado')
}
