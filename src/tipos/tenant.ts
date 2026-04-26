// Tipos do tenant (estabelecimento/empresa cliente do SaaS)
export type SegmentoTenant = 'salao' | 'barbearia' | 'estetica' | 'tatuagem' | 'manicure'
export type PlanoTenant = 'freemium' | 'profissional'
export type StatusTenant = 'ativo' | 'suspenso' | 'cancelado'

export interface Tenant {
  id: string
  nome: string
  segmento: SegmentoTenant
  plano: PlanoTenant
  status: StatusTenant
  logo_url?: string
  criadoEm: string
}

export interface Unidade {
  id: string
  tenantId: string
  nome: string
  ativo: boolean
}
