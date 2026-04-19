// Serviço: cálculo de comissões dos profissionais.
// Sempre retornar valores em centavos.
export interface CalculoComissao {
  profissionalId: string
  periodoInicio: Date
  periodoFim: Date
}

export async function calcularComissao(_input: CalculoComissao): Promise<number> {
  throw new Error('calcularComissao: não implementado')
}
