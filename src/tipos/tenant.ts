// Tipos do tenant (estabelecimento/empresa cliente do SaaS)
export type SegmentoTenant =
  | 'barbearia'
  | 'salao'
  | 'estetica'
  | 'tatuagem'
  | 'manicure'

export interface Tenant {
  id: string
  nome: string
  segmento: SegmentoTenant
  planoId: string
  criadoEm: string
}
