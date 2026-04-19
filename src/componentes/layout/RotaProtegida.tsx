// Guard de rota autenticada (painel do tenant).
//  - Sem sessão → /login
//  - Sessão + role super_admin → /super-admin
//  - Caso contrário → renderiza <Outlet />
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'

type Estado = 'carregando' | 'painel' | 'super_admin' | 'anonimo'

export const RotaProtegida = () => {
  const localizacao = useLocation()
  const [estado, setEstado] = useState<Estado>('carregando')

  useEffect(() => {
    const avaliar = async (userId: string | null) => {
      if (!userId) {
        setEstado('anonimo')
        return
      }
      // Consulta roles diretamente — fonte de verdade segura.
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      const ehSuper = (data ?? []).some((r) => r.role === 'super_admin')
      setEstado(ehSuper ? 'super_admin' : 'painel')
    }

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evt, sessao) => {
      setTimeout(() => avaliar(sessao?.user.id ?? null), 0)
    })
    supabase.auth.getSession().then(({ data }) => avaliar(data.session?.user.id ?? null))
    return () => assinatura.subscription.unsubscribe()
  }, [])

  if (estado === 'carregando') {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
  }
  if (estado === 'anonimo') {
    return <Navigate to="/login" replace state={{ de: localizacao.pathname }} />
  }
  if (estado === 'super_admin' && !localizacao.pathname.startsWith('/super-admin')) {
    return <Navigate to="/super-admin" replace />
  }
  return <Outlet />
}

export default RotaProtegida
