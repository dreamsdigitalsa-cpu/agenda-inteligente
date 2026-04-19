// Serviço: geração de relatórios financeiros.
// Exige PERM-003. Dados sempre vindos do servidor (não cachear).
export interface FiltroRelatorio {
  inicio: Date
  fim: Date
}

export async function gerarRelatorioFinanceiro(_filtro: FiltroRelatorio) {
  throw new Error('gerarRelatorioFinanceiro: não implementado')
}
