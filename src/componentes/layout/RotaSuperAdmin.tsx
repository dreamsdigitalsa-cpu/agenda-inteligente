// Guard de rota do super admin.
// Responsabilidade:
//  - Verifica a sessão atual no Supabase.
//  - Se não houver sessão, redireciona para /login.
//  - Se o usuário NÃO for super_admin, redireciona para /painel.
//  - Caso contrário, renderiza <Outlet /> (a rota filha).
//
// O perfil é lido a partir do JWT (app_metadata.perfil), que deve ser
// preenchido pelo backend no momento do login para evitar escalonamento.
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/cliente'

type EstadoSessao = 'carregando' | 'autorizado' | 'nao_autorizado' | 'anonimo'

export const RotaSuperAdmin = () => {
  const [estado, setEstado] = useState<EstadoSessao>('carregando')

  useEffect(() => {
    const avaliar = (sessao: Session | null) => {
      if (!sessao) {
        setEstado('anonimo')
        return
      }
      const perfil =
        (sessao.user.app_metadata as Record<string, unknown> | undefined)?.perfil ??
        (sessao.user.user_metadata as Record<string, unknown> | undefined)?.perfil
      setEstado(perfil === 'super_admin' ? 'autorizado' : 'nao_autorizado')
    }

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      avaliar(novaSessao)
    })

    supabase.auth.getSession().then(({ data }) => avaliar(data.session))

    return () => {
      assinatura.subscription.unsubscribe()
    }
  }, [])

  if (estado === 'carregando') {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
  }
  if (estado === 'anonimo') return <Navigate to="/login" replace />
  if (estado === 'nao_autorizado') return <Navigate to="/painel" replace />

  return <Outlet />
}

export default RotaSuperAdmin
