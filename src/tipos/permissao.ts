// Tipos do sistema de permissões granulares.
// Códigos de permissão centralizados em PERMISSOES.
export type { CodigoPermissao } from '../lib/constantes/permissoes'
export { PERMISSOES } from '../lib/constantes/permissoes'

// Categorias usadas para agrupar permissões na UI
export type CategoriaPermissao = 'AGENDAMENTOS' | 'FINANCEIRO' | 'CADASTROS' | 'SISTEMA'

export interface DefinicaoPermissao {
  codigo: string
  rotulo: string
  categoria: CategoriaPermissao
}

// Catálogo único exibido na tela de configuração.
// PERM-011 (impersonar) é exclusiva do super admin e fica fora desta lista.
export const CATALOGO_PERMISSOES: DefinicaoPermissao[] = [
  { codigo: 'PERM-001', rotulo: 'Excluir agendamento', categoria: 'AGENDAMENTOS' },
  { codigo: 'PERM-002', rotulo: 'Editar agendamento de outro profissional', categoria: 'AGENDAMENTOS' },
  { codigo: 'PERM-008', rotulo: 'Cancelar agendamento com menos de 2 horas', categoria: 'AGENDAMENTOS' },
  { codigo: 'PERM-003', rotulo: 'Visualizar relatórios financeiros', categoria: 'FINANCEIRO' },
  { codigo: 'PERM-004', rotulo: 'Realizar fechamento de caixa', categoria: 'FINANCEIRO' },
  { codigo: 'PERM-009', rotulo: 'Aplicar desconto acima de 20%', categoria: 'FINANCEIRO' },
  { codigo: 'PERM-005', rotulo: 'Gerenciar profissionais (adicionar/remover)', categoria: 'CADASTROS' },
  { codigo: 'PERM-006', rotulo: 'Configurar serviços e preços', categoria: 'CADASTROS' },
  { codigo: 'PERM-007', rotulo: 'Acessar histórico completo de clientes', categoria: 'CADASTROS' },
  { codigo: 'PERM-010', rotulo: 'Gerenciar estoque', categoria: 'CADASTROS' },
  { codigo: 'PERM-012', rotulo: 'Alterar plano de assinatura', categoria: 'SISTEMA' },
]

export interface PerfilPermissao {
  id: string
  tenantId: string
  nome: string
  descricao: string | null
  padrao: boolean
  permissoes: string[]
}
