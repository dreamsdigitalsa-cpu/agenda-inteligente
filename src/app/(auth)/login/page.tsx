import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  Sparkles, 
  LayoutDashboard, 
  Bell, 
  Smartphone,
  CheckCircle2,
  Newspaper
} from 'lucide-react'

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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Coluna Esquerda: Formulário */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
              <div className="bg-primary/10 p-2 rounded-xl">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-bold tracking-tight">StudioFlow</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seu estúdio com inteligência e simplicidade.
            </p>
          </div>

          <Card className="border-none shadow-none p-0">
            <form onSubmit={handleSubmit(submeter)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="h-11 bg-muted/50 border-none focus-visible:ring-primary"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                  <Link to="/recuperar-senha" name="forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 bg-muted/50 border-none focus-visible:ring-primary"
                  {...register('senha')}
                />
                {errors.senha && (
                  <p className="text-xs font-medium text-destructive">{errors.senha.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold transition-all hover:translate-y-[-1px] active:translate-y-[0px]" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link to="/cadastro" className="text-primary hover:underline font-semibold">
                    Cadastre seu estúdio
                  </Link>
                </p>
              </div>
            </form>
          </Card>
          
          <p className="text-center text-xs text-muted-foreground pt-4">
            &copy; {new Date().getFullYear()} StudioFlow. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Coluna Direita: Novidades e Social Proof (Visível apenas em Desktop) */}
      <div className="hidden lg:flex flex-col bg-muted/30 border-l relative overflow-hidden p-12 justify-between">
        {/* Decorative Circles */}
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative space-y-8">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none py-1.5 px-3">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 fill-primary" />
            O que há de novo no StudioFlow
          </Badge>

          <div className="grid gap-6">
            <div className="group bg-background/60 backdrop-blur-sm border border-border/50 p-6 rounded-2xl transition-all hover:shadow-lg hover:border-primary/20">
              <div className="flex gap-4">
                <div className="bg-blue-500/10 p-3 rounded-xl h-fit">
                  <Smartphone className="h-6 w-6 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">App do Cliente VIP</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Agora seus clientes podem agendar, comprar pacotes e ver o histórico direto em um app exclusivo com a sua marca.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-background/60 backdrop-blur-sm border border-border/50 p-6 rounded-2xl transition-all hover:shadow-lg hover:border-primary/20">
              <div className="flex gap-4">
                <div className="bg-green-500/10 p-3 rounded-xl h-fit">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">Confirmação via WhatsApp v2</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Reduza faltas em até 40% com o novo fluxo de confirmação automática por IA.
                  </p>
                </div>
              </div>
            </div>

            <div className="group bg-background/60 backdrop-blur-sm border border-border/50 p-6 rounded-2xl transition-all hover:shadow-lg hover:border-primary/20">
              <div className="flex gap-4">
                <div className="bg-purple-500/10 p-3 rounded-xl h-fit">
                  <Newspaper className="h-6 w-6 text-purple-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">Blog: 5 dicas para escalar seu faturamento</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Confira as estratégias de marketing mais eficazes para 2024 usadas pelos estúdios de maior sucesso.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative pt-12">
          <div className="bg-primary p-8 rounded-3xl text-primary-foreground space-y-4 shadow-2xl">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-primary bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary-foreground/20 flex items-center justify-center text-[10px] font-bold">
                +2k
              </div>
            </div>
            <p className="text-lg font-medium leading-tight">
              "O StudioFlow transformou a forma como gerencio minha equipe e atendimentos. Prático e intuitivo!"
            </p>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-primary-foreground/30" />
              <span className="text-sm font-semibold opacity-90">Mariana Costa, Studio Art</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

