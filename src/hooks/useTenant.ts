// Hook que expõe o tenant atual e o usuário logado.
// Implementação placeholder — substituir por contexto real assim que
// a autenticação Supabase + tabela de tenants estiver pronta.
import { useState } from 'react'
import type { Tenant } from '../tipos/tenant'
import type { Usuario } from '../tipos/usuario'

interface EstadoTenant {
  tenant: Tenant | null
  usuario: Usuario | null
  carregando: boolean
}

export function useTenant(): EstadoTenant {
  // TODO: trocar por leitura de contexto/SDK Supabase
  const [estado] = useState<EstadoTenant>({
    tenant: null,
    usuario: null,
    carregando: false,
  })
  return estado
}
