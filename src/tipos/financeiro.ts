import { LucideIcon } from 'lucide-react'

export type TipoMovimento = 'receita' | 'despesa'
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado'

export interface LancamentoFinanceiroAdmin {
  id: string
  tipo: TipoMovimento
  categoria: string
  valor: number
  descricao: string | null
  data_lancamento: string
  status: StatusLancamento
  criado_em: string
  updated_at: string
}

export interface MetricasFinanceiras {
  receitaTotal: number
  despesaTotal: number
  saldoTotal: number
  mrr: number
  churnRate: number
  tenantsAtivos: number
}
