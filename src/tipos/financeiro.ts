// Tipos do domínio financeiro
// IMPORTANTE: valores monetários são sempre em centavos (inteiros).
export type TipoMovimento = 'entrada' | 'saida'
export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'

export interface MovimentoFinanceiro {
  id: string
  tenantId: string
  caixaId: string
  tipo: TipoMovimento
  valorCentavos: number
  formaPagamento: FormaPagamento
  descricao: string
  criadoEm: string
}
