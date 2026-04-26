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
  Smartphone,
  CheckCircle2,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  type CarouselApi
} from '@/components/ui/carousel'
import logoStudioFlow from '@/assets/studioflow-logo.png'

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
    icone: <Smartphone className="h-6 w-6 text-blue-400" />,
    bgIcone: 'bg-blue-500/10',
    imagem: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=1200',
  },
  {
    titulo: 'Confirmação via WhatsApp v2',
    descricao: 'Reduza faltas em até 40% com o novo fluxo de confirmação automática por IA.',
    icone: <CheckCircle2 className="h-6 w-6 text-green-400" />,
    bgIcone: 'bg-green-500/10',
    imagem: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1200',
  },
  {
    titulo: 'Marketing para Estúdios',
    descricao: 'Confira as estratégias de marketing mais eficazes para 2024 usadas pelos estúdios de maior sucesso.',
    icone: <Newspaper className="h-6 w-6 text-purple-400" />,
    bgIcone: 'bg-purple-500/10',
    imagem: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200',
  },
]

const Login = () => {
  const navegar = useNavigate()
  const [api, setApi] = useState<CarouselApi>()
  const [atual, setAtual] = useState(0)
  const [mostrarSenha, setMostrarSenha] = useState(false)

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-950 font-sans antialiased">
      {/* Coluna Esquerda: Formulário */}
      <div className="flex flex-col items-center justify-center p-8 relative overflow-hidden bg-background">
        {/* Decorative Background for Login side */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-[420px] space-y-10 relative z-10">
          <div className="flex flex-col space-y-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="bg-primary p-2.5 rounded-2xl shadow-xl shadow-primary/25 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-white"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <span className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic">StudioFlow</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Bem-vindo de volta</h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg">
                Sua gestão, em um só fluxo.
              </p>
            </div>
          </div>

          <Card className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 rounded-[2.5rem] overflow-hidden relative">
            {/* Glossy edge effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            
            <form onSubmit={handleSubmit(submeter)} className="space-y-6" noValidate>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-sm uppercase tracking-wider">E-mail</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors duration-300" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@studio.com"
                    className="h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-primary focus-visible:border-primary transition-all duration-300 rounded-[1.25rem] text-base font-medium"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-bold text-red-500 ml-1 mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full" /> {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="senha" className="text-zinc-600 dark:text-zinc-400 font-semibold text-sm uppercase tracking-wider">Senha</Label>
                  <Link to="/recuperar-senha" title="Esqueceu a senha?" className="text-xs text-primary hover:text-primary/80 transition-colors font-bold tracking-tight">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors duration-300" />
                  </div>
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-14 pl-12 pr-12 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-primary focus-visible:border-primary transition-all duration-300 rounded-[1.25rem] text-base font-medium"
                    {...register('senha')}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-300"
                  >
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.senha && (
                  <p className="text-xs font-bold text-red-500 ml-1 mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full" /> {errors.senha.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-[1.25rem] bg-primary text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <span>Acessar Painel</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">
                  Não possui conta?{' '}
                  <Link to="/cadastro" className="text-zinc-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors font-bold underline underline-offset-8 decoration-primary/30 hover:decoration-primary transition-all">
                    Criar conta grátis
                  </Link>
                </p>
              </div>
            </form>
          </Card>
          
          <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 pt-4 font-bold uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} StudioFlow &bull; All Rights Reserved
          </p>
        </div>
      </div>

      {/* Coluna Direita: Carrossel de Novidades */}
      <div className="hidden lg:block relative overflow-hidden bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
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
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        ))}

        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="space-y-8">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/10 py-2 px-4 backdrop-blur-xl text-xs font-bold uppercase tracking-widest rounded-full">
              <Sparkles className="h-3.5 w-3.5 mr-2 fill-white animate-pulse" />
              What's New
            </Badge>

            <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
              <CarouselContent>
                {NOVIDADES.map((item, index) => (
                  <CarouselItem key={index}>
                    <div className="space-y-6">
                      <div className={`${item.bgIcone} p-5 rounded-[1.5rem] h-fit w-fit backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/20`}>
                        {item.icone}
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-5xl font-black text-white tracking-tighter leading-none">
                          {item.titulo}
                        </h2>
                        <p className="text-xl text-zinc-300 font-medium leading-relaxed max-w-lg opacity-80">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              <div className="flex items-center gap-6 mt-12">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all backdrop-blur-md"
                    onClick={() => api?.scrollPrev()}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all backdrop-blur-md"
                    onClick={() => api?.scrollNext()}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {NOVIDADES.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                        i === atual ? 'w-10 bg-primary shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'w-2.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Carousel>
          </div>

          <div className="relative group">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] text-white space-y-5 shadow-2xl overflow-hidden group-hover:bg-white/10 transition-colors duration-500">
              <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Sparkles className="h-48 w-48 text-white" />
              </div>
              <div className="flex -space-x-4 relative z-10">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-2xl border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden shadow-xl">
                    <img src={`https://i.pravatar.cc/100?img=${i+30}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="w-12 h-12 rounded-2xl border-2 border-zinc-900 bg-primary flex items-center justify-center text-xs font-black text-white shadow-xl">
                  +2K
                </div>
              </div>
              <p className="text-xl font-bold leading-tight relative z-10 italic">
                "O StudioFlow é o coração do meu negócio. Não consigo mais imaginar minha rotina sem essa agilidade!"
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-0.5 w-10 bg-primary/50 rounded-full" />
                <span className="text-sm font-black uppercase tracking-widest text-zinc-400">Mariana Costa, Studio Art</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
