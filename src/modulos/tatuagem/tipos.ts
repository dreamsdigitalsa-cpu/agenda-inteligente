export type TattooBudgetStatus = 'em_analise' | 'aprovado' | 'em_andamento' | 'concluido';

export interface TattooBudget {
  id: string;
  tenant_id: string;
  cliente_id: string;
  profissional_id: string;
  regiao_corpo: string;
  tamanho: string;
  estilo: string;
  descricao?: string;
  valor_estimado?: number;
  valor_deposito?: number;
  deposito_pago: boolean;
  status: TattooBudgetStatus;
  referencias?: string[];
  criado_em: string;
  atualizado_em: string;
  // Join fields
  cliente?: {
    nome: string;
    telefone?: string;
  };
  profissional?: {
    nome: string;
  };
}

export interface TattooBudgetSession {
  id: string;
  budget_id: string;
  agendamento_id?: string;
  data: string;
  notas?: string;
  valor?: number;
  criado_em: string;
  atualizado_em: string;
}

export interface TattooPortfolioItem {
  id: string;
  tenant_id: string;
  profissional_id: string;
  imagem_url: string;
  estilo: string;
  categoria?: string;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
  profissional?: {
    nome: string;
  };
}
