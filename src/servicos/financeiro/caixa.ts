// Serviço: abertura, lançamento e fechamento de caixa.
// Operações sensíveis — exigir verificação de PERM-004.
export async function abrirCaixa(_valorInicialCentavos: number): Promise<string> {
  throw new Error('abrirCaixa: não implementado')
}

export async function fecharCaixa(_caixaId: string): Promise<void> {
  throw new Error('fecharCaixa: não implementado')
}
