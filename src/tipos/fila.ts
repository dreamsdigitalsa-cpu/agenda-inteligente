export type StatusFila = 'aguardando' | 'chamado' | 'atendido' | 'cancelado'

export interface ItemFila {
  id: string
  tenantId: string
  unidadeId: string
  profissionalId: string | null
  clienteId: string | null
  clienteNome: string
  clienteTelefone: string | null
  servicoId: string | null
  posicao: number
  status: StatusFila
  entradaEm: string
  chamadoEm: string | null
  createdAt: string
  updatedAt: string
}
