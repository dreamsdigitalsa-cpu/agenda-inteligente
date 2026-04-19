// Guard de rota autenticada (painel do tenant).
// Responsabilidade:
//  - Verifica a sessão atual no Supabase.
//  - Se não houver sessão, redireciona para /login.
//  - Se o usuário for super_admin, redireciona para /super-admin.
//  - Caso contrário, renderiza <Outlet /> (a rota filha).
//
// Importante: o listener onAuthStateChange é registrado ANTES de getSession()
// para evitar perder eventos de login/logout.
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/cliente'

type EstadoSessao = 'carregando' | 'autenticado' | 'anonimo'

export const RotaProtegida = () => {
  const localizacao = useLocation()
  const [estado, setEstado] = useState<EstadoSessao>('carregando')
  const [sessao, setSessao] = useState<Session | null>(null)

  useEffect(() => {
    // 1) registra o listener primeiro
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setEstado(novaSessao ? 'autenticado' : 'anonimo')
    })

    // 2) então consulta a sessão atual
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setEstado(data.session ? 'autenticado' : 'anonimo')
    })

    return () => {
      assinatura.subscription.unsubscribe()
    }
  }, [])

  if (estado === 'carregando') {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
  }

  if (estado === 'anonimo') {
    return <Navigate to="/login" replace state={{ de: localizacao.pathname }} />
  }

  // Se for super_admin, manda para o painel correto.
  // O perfil pode vir em app_metadata (definido pelo backend) ou user_metadata.
  const perfil =
    (sessao?.user.app_metadata as Record<string, unknown> | undefined)?.perfil ??
    (sessao?.user.user_metadata as Record<string, unknown> | undefined)?.perfil

  if (perfil === 'super_admin' && !localizacao.pathname.startsWith('/super-admin')) {
    return <Navigate to="/super-admin" replace />
  }

  return <Outlet />
}

export default RotaProtegida
