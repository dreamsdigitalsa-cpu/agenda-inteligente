// Página pública: landing principal do HubBeleza SaaS.
// Apresenta hero, segmentos, funcionalidades, planos e footer.
// Sem chamadas ao Supabase — conteúdo 100% estático.
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Scissors,
  Sparkles,
  Leaf,
  Palette,
  Brush,
  Calendar,
  DollarSign,
  Users,
  MessageCircle,
  BarChart3,
  Smartphone,
  Check,
} from 'lucide-react'

// Configuração dos segmentos suportados pela plataforma.
// Cada segmento tem slug (rota), ícone, cores e textos próprios.
const SEGMENTOS = [
  {
    slug: 'salao',
    nome: 'Salão de Beleza',
    descricao: 'Para salões com múltiplos serviços e profissionais',
    Icone: Scissors,
    cor: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
    iconeCor: 'bg-rose-500 text-white',
  },
  {
    slug: 'barbearia',
    nome: 'Barbearia',
    descricao: 'Fila de espera, agendamentos e controle de cadeiras',
    Icone: Sparkles,
    cor: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200',
    iconeCor: 'bg-slate-800 text-white',
  },
  {
    slug: 'estetica',
    nome: 'Estética',
    descricao: 'Anamnese digital e fotos de evolução de tratamentos',
    Icone: Leaf,
    cor: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    iconeCor: 'bg-emerald-600 text-white',
  },
  {
    slug: 'tatuagem',
    nome: 'Tatuagem',
    descricao: 'Orçamentos, portfólio e gestão de sessões',
    Icone: Palette,
    cor: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    iconeCor: 'bg-purple-600 text-white',
  },
  {
    slug: 'manicure',
    nome: 'Manicure',
    descricao: 'Agendamentos rápidos e controle de produtos',
    Icone: Brush,
    cor: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    iconeCor: 'bg-orange-500 text-white',
  },
] as const

// Lista de funcionalidades exibidas no grid.
const FUNCIONALIDADES = [
  { Icone: Calendar, titulo: 'Agendamento online 24h', texto: 'Seus clientes marcam horário a qualquer momento, direto do celular.' },
  { Icone: DollarSign, titulo: 'Controle financeiro', texto: 'Caixa, comissões, despesas e relatórios em tempo real.' },
  { Icone: Users, titulo: 'Múltiplos profissionais', texto: 'Cada profissional com sua agenda, comissão e permissões.' },
  { Icone: MessageCircle, titulo: 'Comunicação automática', texto: 'Confirmações via WhatsApp, SMS e e-mail sem esforço.' },
  { Icone: BarChart3, titulo: 'Relatórios e métricas', texto: 'Acompanhe faturamento, ocupação e ticket médio.' },
  { Icone: Smartphone, titulo: 'App mobile', texto: 'Em breve no Android e iOS para gestão na palma da mão.' },
] as const

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAVBAR — navegação principal e CTA de cadastro */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <nav className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Hub<span className="text-primary">Beleza</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Entrar
            </Link>
          </div>
          <Button asChild>
            <Link to="/cadastro">Começar grátis</Link>
          </Button>
        </nav>
      </header>

      {/* HERO — proposta de valor + CTAs principais */}
      <section className="container grid gap-12 py-16 md:grid-cols-2 md:py-24 lg:py-32">
        <div className="flex flex-col justify-center gap-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Gerencie seu salão, barbearia ou estúdio em <span className="text-primary">um só lugar</span>
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            Sistema completo para agendamentos, financeiro, clientes e muito mais. Experimente grátis agora.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="outline" asChild>
              <a href="#segmentos">Ver demonstração</a>
            </Button>
            <Button size="lg" asChild>
              <Link to="/cadastro">Criar conta grátis</Link>
            </Button>
          </div>
        </div>
        {/* Mockup placeholder — substituir por imagem real do app futuramente */}
        <div className="relative">
          <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 via-accent to-secondary p-8 shadow-2xl">
            <div className="h-full w-full rounded-xl bg-card p-6 shadow-inner">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-20 rounded-lg bg-muted/60" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-12 rounded bg-primary/20" />
                  <div className="h-12 rounded bg-muted" />
                  <div className="h-12 rounded bg-muted" />
                </div>
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEGMENTOS — cada card leva à demo interativa do segmento */}
      <section id="segmentos" className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Escolha seu segmento e veja o sistema funcionando
            </h2>
            <p className="mt-3 text-muted-foreground">
              Cada segmento tem recursos específicos para o seu dia a dia.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEGMENTOS.map(({ slug, nome, descricao, Icone, cor, iconeCor }) => (
              <Link
                key={slug}
                to={`/demo/${slug}`}
                className={`group flex flex-col rounded-xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${cor}`}
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${iconeCor}`}>
                  <Icone className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{nome}</h3>
                <p className="mt-1 text-sm opacity-80">{descricao}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium">
                  Ver demonstração →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES — destaques do produto em grid */}
      <section id="funcionalidades" className="container py-16 md:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Tudo que você precisa para crescer</h2>
          <p className="mt-3 text-muted-foreground">
            Recursos pensados para o dia a dia de quem trabalha com beleza.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONALIDADES.map(({ Icone, titulo, texto }) => (
            <Card key={titulo} className="border-border transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icone className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{titulo}</CardTitle>
                <CardDescription>{texto}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* PREÇOS — dois planos lado a lado */}
      <section id="precos" className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Planos simples e transparentes</h2>
            <p className="mt-3 text-muted-foreground">Comece grátis. Faça upgrade quando precisar.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Plano Freemium */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Freemium</CardTitle>
                <CardDescription>Para quem está começando</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Grátis</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Até 50 agendamentos/mês
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> 2 profissionais
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Agendamento online
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Cadastro de clientes
                  </li>
                </ul>
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <Link to="/cadastro">Começar grátis</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plano Profissional */}
            <Card className="relative flex flex-col border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Mais popular
              </div>
              <CardHeader>
                <CardTitle>Profissional</CardTitle>
                <CardDescription>Para negócios em crescimento</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 89</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Agendamentos ilimitados
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Profissionais ilimitados
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Financeiro completo + comissões
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> WhatsApp, SMS e e-mail automáticos
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> Relatórios avançados
                  </li>
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link to="/cadastro">Começar grátis</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FOOTER — links institucionais */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HubBeleza. Todos os direitos reservados.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Sobre</a>
            <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
