import { useState, useEffect } from 'react'
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
  Smartphone,
  CheckCircle2,
  Newspaper,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext,
  type CarouselApi
} from '@/components/ui/carousel'

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

const NOVIDADES = [
  {
    titulo: 'App do Cliente VIP',
    descricao: 'Agora seus clientes podem agendar, comprar pacotes e ver o histórico direto em um app exclusivo com a sua marca.',
    icone: <Smartphone className="h-6 w-6 text-blue-500" />,
    bgIcone: 'bg-blue-500/10',
    imagem: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=1200',
  },
  {
    titulo: 'Confirmação via WhatsApp v2',
    descricao: 'Reduza faltas em até 40% com o novo fluxo de confirmação automática por IA.',
    icone: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    bgIcone: 'bg-green-500/10',
    imagem: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1200',
  },
  {
    titulo: 'Marketing para Estúdios',
    descricao: 'Confira as estratégias de marketing mais eficazes para 2024 usadas pelos estúdios de maior sucesso.',
    icone: <Newspaper className="h-6 w-6 text-purple-500" />,
    bgIcone: 'bg-purple-500/10',
    imagem: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200',
  },
]

const Login = () => {
  const navegar = useNavigate()
  const [api, setApi] = useState<CarouselApi>()
  const [atual, setAtual] = useState(0)

  useEffect(() => {
    if (!api) return

    setAtual(api.selectedScrollSnap())

    api.on('select', () => {
      setAtual(api.selectedScrollSnap())
    })
  }, [api])

  // Auto-play
  useEffect(() => {
    if (!api) return
    const interval = setInterval(() => {
      api.scrollNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [api])

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
                  <Link to="/recuperar-senha" className="text-xs text-primary hover:underline font-medium">
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

      {/* Coluna Direita: Carrossel de Novidades */}
      <div className="hidden lg:block relative overflow-hidden bg-zinc-900 border-l">
        {/* Background Images Overlay */}
        {NOVIDADES.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === atual ? 'opacity-40' : 'opacity-0'
            }`}
          >
            <img
              src={item.imagem}
              alt=""
              className="w-full h-full object-cover scale-110 blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        ))}

        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="space-y-8">
            <Badge variant="secondary" className="bg-white/10 text-white border-none py-1.5 px-3 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 fill-white" />
              Novidades StudioFlow
            </Badge>

            <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
              <CarouselContent>
                {NOVIDADES.map((item, index) => (
                  <CarouselItem key={index}>
                    <div className="space-y-6">
                      <div className={`${item.bgIcone} p-4 rounded-2xl h-fit w-fit backdrop-blur-sm border border-white/10`}>
                        {item.icone}
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-white tracking-tight">
                          {item.titulo}
                        </h2>
                        <p className="text-xl text-zinc-300 leading-relaxed max-w-lg">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              <div className="flex items-center gap-4 mt-8">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white transition-all"
                    onClick={() => api?.scrollPrev()}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white transition-all"
                    onClick={() => api?.scrollNext()}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex gap-1.5">
                  {NOVIDADES.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === atual ? 'w-8 bg-primary' : 'w-2 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Carousel>
          </div>

          <div className="relative">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-white space-y-4 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-24 w-24 text-white" />
              </div>
              <div className="flex -space-x-3 relative z-10">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-800 bg-zinc-700 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="avatar" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-zinc-800 bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                  +2k
                </div>
              </div>
              <p className="text-lg font-medium leading-tight relative z-10">
                "O StudioFlow transformou a forma como gerencio minha equipe e atendimentos. Prático e intuitivo!"
              </p>
              <div className="flex items-center gap-2 relative z-10">
                <div className="h-px w-8 bg-white/30" />
                <span className="text-sm font-semibold text-zinc-300">Mariana Costa, Studio Art</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

