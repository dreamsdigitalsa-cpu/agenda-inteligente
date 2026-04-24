// Tela de login.
// Validação de input com Zod antes de chamar o Supabase Auth.
// Após autenticar, consulta roles do usuário e redireciona:
//   super_admin → /super-admin
//   demais      → /painel/agenda
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ── Schema Zod ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido')
    .max(255, 'E-mail muito longo'),
  senha: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha muito longa'),
})

type LoginForm = z.infer<typeof loginSchema>

// ── Componente ────────────────────────────────────────────────────────────────

const Login = () => {
  const navegar = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  })

  const submeter = async ({ email, senha }: LoginForm) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      // Não expõe detalhes internos — mensagem genérica para evitar enumeração de usuários
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(submeter)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                {...register('senha')}
                aria-invalid={!!errors.senha}
              />
              {errors.senha && (
                <p className="text-xs text-destructive">{errors.senha.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
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
