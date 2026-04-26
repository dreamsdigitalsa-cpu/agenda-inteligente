import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  Store, 
  ArrowRight,
  Sparkles,
  ChevronDown
} from 'lucide-react'
import logoStudioFlow from '@/assets/studioflow-logo.png'

// ── Schema Zod ────────────────────────────────────────────────────────────────

const SEGMENTOS_VALIDOS = ['salao', 'barbearia', 'estetica', 'tatuagem', 'manicure'] as const
type Segmento = typeof SEGMENTOS_VALIDOS[number]

const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  email: z
    .string()
    .trim()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido')
    .max(255, 'E-mail muito longo'),
  senha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/[A-Za-z]/, 'Senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmarSenha: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
  nomeEstabelecimento: z
    .string()
    .trim()
    .min(2, 'Nome do estabelecimento deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do estabelecimento muito longo'),
  segmento: z.enum(SEGMENTOS_VALIDOS, { required_error: 'Selecione um segmento' }),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
})

type CadastroForm = z.infer<typeof cadastroSchema>

const SEGMENTOS_LABELS: Record<Segmento, string> = {
  salao:     'Salão de Beleza',
  barbearia: 'Barbearia',
  estetica:  'Estética',
  tatuagem:  'Tatuagem',
  manicure:  'Manicure',
}

// ── Componente ────────────────────────────────────────────────────────────────

const Cadastro = () => {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

  const segmentoInicial = (
    SEGMENTOS_VALIDOS.includes(params.get('segmento') as Segmento)
      ? params.get('segmento')
      : 'salao'
  ) as Segmento

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      nome:                '',
      email:               '',
      senha:               '',
      confirmarSenha:      '',
      nomeEstabelecimento: '',
      segmento:            segmentoInicial,
    },
  })

  const submeter = async ({ nome, email, senha, nomeEstabelecimento, segmento }: CadastroForm) => {
    const { data: signUpData, error: errSignUp } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/confirmar-email`,
        data: { nome, nomeEstabelecimento, segmento },
      },
    })
    
    if (errSignUp) {
      toast.error(
        errSignUp.message.toLowerCase().includes('already')
          ? 'Este e-mail já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.',
      )
      return
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      toast.success('Conta criada! Verifique seu e-mail para ativar.')
      navegar('/login')
      return
    }
    
    toast.loading('Criando seu estabelecimento...', { id: 'criar-tenant' })
    
    const { data: resultado, error: errFn } = await supabase.functions.invoke('criar-tenant', {
      body: { nomeEstabelecimento, segmento, nomeAdmin: nome },
    })
    
    toast.dismiss('criar-tenant')
    
    if (errFn || resultado?.erro) {
      console.error('[cadastro] erro criar-tenant:', errFn, resultado)
      toast.error(`Erro ao configurar estabelecimento: ${errFn?.message || resultado?.detalhe || 'tente novamente'}`)
      await supabase.auth.signOut()
      return
    }
    
    toast.success('Bem-vindo ao StudioFlow!')
    navegar('/onboarding')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-950 font-sans antialiased">
      {/* Coluna Esquerda: Novidades/Branding (Visível apenas em Desktop) */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 p-12 justify-between">
        <div className="absolute inset-0 transition-opacity duration-1000 opacity-30">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3">
            <img 
              src={logoStudioFlow} 
              alt="StudioFlow"
              className="h-16 w-auto object-contain drop-shadow-[0_8px_24px_rgba(139,92,246,0.35)]"
            />
          </div>

          <div className="space-y-6 max-w-lg">
            <Badge className="bg-primary/20 text-primary border-primary/20 py-2 px-4 backdrop-blur-xl text-xs font-bold uppercase tracking-widest rounded-full">
              <Sparkles className="h-3.5 w-3.5 mr-2 fill-primary animate-pulse" />
              Gestão Inteligente
            </Badge>
            <h2 className="text-5xl font-black text-white tracking-tighter leading-tight">
              Sua jornada para o sucesso começa aqui.
            </h2>
            <p className="text-xl text-zinc-300 font-medium leading-relaxed opacity-80">
              Gerencie agendamentos, finanças e clientes em uma única plataforma intuitiva e poderosa.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] text-white space-y-4 shadow-2xl">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-2xl border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+40}`} alt="avatar" />
                </div>
              ))}
            </div>
            <p className="text-lg font-bold leading-tight italic">
              "A melhor decisão que tomei para o meu estúdio este ano."
            </p>
            <span className="text-sm font-black uppercase tracking-widest text-zinc-400">Ricardo Lima, Barbearia Classic</span>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Formulário */}
      <div className="flex flex-col items-center justify-center p-8 relative overflow-hidden bg-background">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-[480px] space-y-8 relative z-10">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoStudioFlow} alt="StudioFlow" className="h-12 w-auto" />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Criar conta grátis</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg">
              Comece agora sua jornada com o StudioFlow.
            </p>
          </div>

          <Card className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 rounded-[2.5rem] relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            
            <form onSubmit={handleSubmit(submeter)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-xs uppercase tracking-wider">Seu Nome</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="nome"
                      placeholder="Nome completo"
                      className="h-12 pl-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      {...register('nome')}
                    />
                  </div>
                  {errors.nome && <p className="text-xs font-bold text-red-500 ml-1">{errors.nome.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-xs uppercase tracking-wider">E-mail</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12 pl-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs font-bold text-red-500 ml-1">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-xs uppercase tracking-wider">Senha</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 pl-11 pr-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      {...register('senha')}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.senha && <p className="text-xs font-bold text-red-500 ml-1">{errors.senha.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-xs uppercase tracking-wider">Confirmar Senha</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="confirmarSenha"
                      type={mostrarConfirmarSenha ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 pl-11 pr-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      {...register('confirmarSenha')}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmarSenha && <p className="text-xs font-bold text-red-500 ml-1">{errors.confirmarSenha.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeEstabelecimento" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-xs uppercase tracking-wider">Nome do Estabelecimento</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    id="nomeEstabelecimento"
                    placeholder="Ex: Studio Art"
                    className="h-12 pl-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 rounded-xl"
                    {...register('nomeEstabelecimento')}
                  />
                </div>
                {errors.nomeEstabelecimento && <p className="text-xs font-bold text-red-500 ml-1">{errors.nomeEstabelecimento.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="segmento" className="text-zinc-600 dark:text-zinc-400 font-semibold ml-1 text-xs uppercase tracking-wider">Segmento</Label>
                <div className="relative group">
                  <select
                    id="segmento"
                    {...register('segmento')}
                    className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary appearance-none transition-all"
                  >
                    {SEGMENTOS_VALIDOS.map((s) => (
                      <option key={s} value={s}>{SEGMENTOS_LABELS[s]}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400">
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
                {errors.segmento && <p className="text-xs font-bold text-red-500 ml-1">{errors.segmento.message}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-bold shadow-2xl shadow-primary/30 hover:-translate-y-0.5 transition-all rounded-2xl bg-primary text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Configurando...' : 'Criar minha conta agora'}
                {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>

              <p className="text-center text-sm text-zinc-500 font-medium">
                Já possui conta?{' '}
                <Link to="/login" className="text-zinc-900 dark:text-white hover:text-primary font-bold underline underline-offset-8 decoration-primary/30">
                  Fazer Login
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Cadastro