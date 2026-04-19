// Tipos do domínio de clientes do tenant.
export interface Cliente {
  id: string
  tenantId: string
  nome: string
  telefone: string
  email: string | null
  dataNascimento: string | null
  comoConheceu: string | null
  observacoes: string | null
  temConta: boolean
  usuarioId: string | null
  ativo: boolean
  criadoEm: string
}

// Estatísticas derivadas do histórico de agendamentos.
export interface EstatisticasCliente {
  totalVisitas: number
  ticketMedio: number
  ultimoServico: string | null
  ultimaVisitaEm: string | null
}
