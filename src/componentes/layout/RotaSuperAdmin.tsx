// Guard de rota /super-admin/*.
//  - Sem sessão → /login
//  - Sessão sem role super_admin → /painel
//  - Caso contrário → renderiza <Outlet />
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'

type Estado = 'carregando' | 'autorizado' | 'nao_autorizado' | 'anonimo'

export const RotaSuperAdmin = () => {
  const [estado, setEstado] = useState<Estado>('carregando')

  useEffect(() => {
    const avaliar = async (userId: string | null) => {
      if (!userId) return setEstado('anonimo')
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      const ehSuper = (data ?? []).some((r) => r.role === 'super_admin')
      setEstado(ehSuper ? 'autorizado' : 'nao_autorizado')
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
  if (estado === 'anonimo') return <Navigate to="/login" replace />
  if (estado === 'nao_autorizado') return <Navigate to="/painel" replace />

  return <Outlet />
}

export default RotaSuperAdmin
