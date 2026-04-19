// Tipo compartilhado dos seeds de demonstração.
// Todos os 5 segmentos seguem essa estrutura para que o preview seja genérico.
export type SegmentoDemo = 'barbearia' | 'salao' | 'estetica' | 'tatuagem' | 'manicure'

export interface ProfissionalDemo {
  id: string
  nome: string
  especialidade: string
}

export interface ServicoDemo {
  id: string
  nome: string
  duracao: number
  preco: number
}

export interface ClienteDemo {
  id: string
  nome: string
  telefone: string
  ultimaVisita: string
}

export interface AgendamentoDemo {
  id: string
  clienteId: string
  profissionalId: string
  servicoId: string
  data: string
  hora: string
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado'
}

export interface FilaEsperaDemo {
  posicao: number
  nome: string
  servico: string
  espera: string
}

export interface SeedDemo {
  segmento: SegmentoDemo
  estabelecimento: { nome: string; cor: string }
  profissionais: ProfissionalDemo[]
  servicos: ServicoDemo[]
  clientes: ClienteDemo[]
  agendamentos: AgendamentoDemo[]
  filaDeEspera?: FilaEsperaDemo[]
  financeiro: { receitaHoje: number; receitaMes: number; ticketMedio: number }
}
