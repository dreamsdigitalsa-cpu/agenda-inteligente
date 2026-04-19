// Tela de login.
// Após autenticar, consulta roles do usuário e redireciona:
//   super_admin → /super-admin
//   demais      → /painel/agenda
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const Login = () => {
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        toast.error('E-mail ou senha inválidos.')
        return
      }
      const userId = data.user?.id
      if (!userId) {
        toast.error('Falha ao identificar usuário.')
        return
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      const ehSuper = (roles ?? []).some((r) => r.role === 'super_admin')
      navegar(ehSuper ? '/super-admin' : '/painel/agenda', { replace: true })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submeter} className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
            <div className="flex justify-between text-sm">
              <Link to="/recuperar-senha" className="text-primary hover:underline">
                Esqueci minha senha
              </Link>
              <Link to="/cadastro" className="text-primary hover:underline">
                Criar conta grátis
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
