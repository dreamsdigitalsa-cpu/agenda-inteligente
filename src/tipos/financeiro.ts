import { LucideIcon } from 'lucide-react'

export type TipoMovimento = 'receita' | 'despesa'
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado'

// Alias para compatibilidade com hooks existentes
export type MovimentoFinanceiro = {
  id: string
  tenantId?: string
  caixaId?: string
  tipo: string
  valorCentavos?: number
  valor?: number
  formaPagamento?: string
  categoria?: string
  descricao: string | null
  data_lancamento?: string
  criadoEm?: string
  criado_em?: string
  updated_at?: string
  status?: StatusLancamento
}

export interface LancamentoFinanceiroAdmin extends MovimentoFinanceiro {
  id: string
  tipo: TipoMovimento
  categoria: string
  valor: number
  data_lancamento: string
  status: StatusLancamento
}

export interface MetricasFinanceiras {
  receitaTotal: number
  despesaTotal: number
  saldoTotal: number
  mrr: number
  churnRate: number
  tenantsAtivos: number
}

