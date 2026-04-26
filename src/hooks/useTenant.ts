// Hook useTenant — fonte única do estado de autenticação + tenant.
// Lê dados de `usuarios` e `user_roles` após o login.
// Atualiza-se automaticamente via onAuthStateChange.
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/cliente'
import type { Tenant } from '@/tipos/tenant'
import type { UsuarioLogado, AppRole } from '@/tipos/usuario'

interface EstadoTenant {
  tenant: Tenant | null
  usuario: UsuarioLogado | null
  assinatura: any | null
  carregando: boolean
  erro: string | null
}

export function useTenant(): EstadoTenant {
  const [estado, setEstado] = useState<EstadoTenant>({
    tenant: null,
    usuario: null,
    assinatura: null,
    carregando: true,
    erro: null,
  })

  const carregar = useCallback(async (authUserId: string | null) => {
    if (!authUserId) {
      setEstado({ tenant: null, usuario: null, assinatura: null, carregando: false, erro: null })
      return
    }
    try {
      // Busca perfil do usuário no tenant
      const { data: usuario, error: errUsuario } = await supabase
        .from('usuarios')
        .select('id, auth_user_id, tenant_id, unidade_id, nome, email, ativo')
        .eq('auth_user_id', authUserId)
        .maybeSingle()
      if (errUsuario) throw errUsuario

      // Busca roles
      const { data: rolesRows, error: errRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUserId)
      if (errRoles) throw errRoles
      const roles = (rolesRows ?? []).map((r) => r.role as AppRole)

      let tenant: Tenant | null = null
      if (usuario?.tenant_id) {
        const { data: t, error: errT } = await supabase
          .from('tenants')
          .select('id, nome, segmento, plano, status, criado_em')
          .eq('id', usuario.tenant_id)
          .maybeSingle()
        if (errT) throw errT
        if (t) {
          tenant = {
            id: t.id,
            nome: t.nome,
            segmento: t.segmento,
            plano: t.plano,
            status: t.status,
            criadoEm: t.criado_em,
          }
        }
      }
      
      // Busca status da assinatura
      const { data: assinatura } = await supabase
        .from('assinaturas_tenant')
        .select('*')
        .eq('tenant_id', usuario?.tenant_id)
        .maybeSingle()

      setEstado({
        tenant,
        assinatura,
        usuario: usuario
          ? {
              id: usuario.id,
              authUserId: usuario.auth_user_id,
              tenantId: usuario.tenant_id,
              unidadeId: usuario.unidade_id,
              nome: usuario.nome,
              email: usuario.email,
              ativo: usuario.ativo,
              roles,
            }
          : null,
        carregando: false,
        erro: null,
      })
    } catch (e) {
      setEstado({
        tenant: null,
        usuario: null,
        carregando: false,
        erro: e instanceof Error ? e.message : 'erro_desconhecido',
      })
    }
  }, [])

  useEffect(() => {
    // 1) listener primeiro
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evt, sessao) => {
      // Adia chamadas Supabase para fora do callback (boa prática)
      setTimeout(() => carregar(sessao?.user.id ?? null), 0)
    })
    // 2) então sessão atual
    supabase.auth.getSession().then(({ data }) => carregar(data.session?.user.id ?? null))
    return () => assinatura.subscription.unsubscribe()
  }, [carregar])

  return estado
}
