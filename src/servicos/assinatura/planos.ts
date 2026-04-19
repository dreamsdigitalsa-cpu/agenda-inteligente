// Serviço: gerenciamento de planos de assinatura disponíveis.
export interface Plano {
  id: string
  nome: string
  precoCentavos: number
  limites: Record<string, number>
}

export async function listarPlanos(): Promise<Plano[]> {
  throw new Error('listarPlanos: não implementado')
}
