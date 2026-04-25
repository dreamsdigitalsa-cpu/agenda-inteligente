// Tela de cadastro do estabelecimento.
// Validação de input com Zod antes de chamar o Supabase Auth.
// Cria usuário no Supabase Auth e em seguida chama a Edge Function
// 'criar-tenant' para criar tenant + unidade + perfil + role 'admin'.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  nomeEstabelecimento: z
    .string()
    .trim()
    .min(2, 'Nome do estabelecimento deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do estabelecimento muito longo'),
  segmento: z.enum(SEGMENTOS_VALIDOS, { required_error: 'Selecione um segmento' }),
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
      nomeEstabelecimento: '',
      segmento:            segmentoInicial,
    },
  })

  const submeter = async ({ nome, email, senha, nomeEstabelecimento, segmento }: CadastroForm) => {
    // 1) Cria usuário no Auth
    const { data: signUpData, error: errSignUp } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/painel/agenda`,
        data: { nome },
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

    // 2) ID do usuário direto da resposta do signUp (funciona mesmo sem sessão ativa)
    const userId = signUpData.user?.id
    if (!userId) {
      toast.error('Falha ao obter dados do usuário recém-criado.')
      return
    }

    // 3) Cria tenant + unidade + role via Edge Function.
    // authUserId no body permite à function configurar o tenant mesmo sem sessão.
    const { error: errFn } = await supabase.functions.invoke('criar-tenant', {
      body: { 
        nomeEstabelecimento, 
        segmento, 
        nomeAdmin: nome,
        authUserId: userId,
      },
    })
    
    if (errFn) {
      toast.error('Conta criada, mas falhou ao configurar o estabelecimento. Entre em contato com o suporte.')
      return
    }

    // 4) Verifica se há sessão (se e-mail confirmation estiver desligado, já loga)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.success('Cadastro criado! Verifique seu e-mail para ativar a conta.')
      navegar('/login')
      return
    }

    toast.success('Bem-vindo ao HubBeleza!')
    navegar('/onboarding')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta grátis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(submeter)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                autoComplete="name"
                {...register('nome')}
                aria-invalid={!!errors.nome}
              />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>

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
              <Label htmlFor="senha">Senha (mín. 8 caracteres)</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                {...register('senha')}
                aria-invalid={!!errors.senha}
              />
              {errors.senha && (
                <p className="text-xs text-destructive">{errors.senha.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nomeEstabelecimento">Nome do estabelecimento</Label>
              <Input
                id="nomeEstabelecimento"
                {...register('nomeEstabelecimento')}
                aria-invalid={!!errors.nomeEstabelecimento}
              />
              {errors.nomeEstabelecimento && (
                <p className="text-xs text-destructive">{errors.nomeEstabelecimento.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="segmento">Segmento</Label>
              <select
                id="segmento"
                {...register('segmento')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SEGMENTOS_VALIDOS.map((s) => (
                  <option key={s} value={s}>{SEGMENTOS_LABELS[s]}</option>
                ))}
              </select>
              {errors.segmento && (
                <p className="text-xs text-destructive">{errors.segmento.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Criando…' : 'Criar conta'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary underline">Entrar</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Cadastro
