// Página pública: landing principal do HubBeleza SaaS.
// Apresenta hero, segmentos, funcionalidades, planos e footer.
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
  Star,
  ArrowRight,
  Menu,
  BadgeCheck,
  Zap,
  Clock,
  ShieldCheck,
  ChevronDown,
  Play,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { BotaoTema } from '@/componentes/tema/BotaoTema'

const SEGMENTOS = [
  {
    slug: 'salao',
    nome: 'Salão de Beleza',
    descricao: 'Gestão completa de serviços, profissionais e estoque.',
    Icone: Scissors,
    cor: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900',
    iconeCor: 'bg-rose-500 text-white',
  },
  {
    slug: 'barbearia',
    nome: 'Barbearia',
    descricao: 'Agendamentos rápidos e controle de comissões por cadeira.',
    Icone: Sparkles,
    cor: 'bg-slate-50 text-slate-800 border-slate-100 hover:bg-slate-100 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-800',
    iconeCor: 'bg-slate-800 text-white',
  },
  {
    slug: 'estetica',
    nome: 'Estética',
    descricao: 'Fichas de anamnese digitais e evolução de tratamentos.',
    Icone: Leaf,
    cor: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900',
    iconeCor: 'bg-emerald-600 text-white',
  },
  {
    slug: 'tatuagem',
    nome: 'Tatuagem',
    descricao: 'Gestão de sessões, orçamentos e galeria de trabalhos.',
    Icone: Palette,
    cor: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900',
    iconeCor: 'bg-purple-600 text-white',
  },
  {
    slug: 'manicure',
    nome: 'Manicure',
    descricao: 'Controle de materiais e fidelização de clientes recorrentes.',
    Icone: Brush,
    cor: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900',
    iconeCor: 'bg-orange-500 text-white',
  },
] as const

const COMO_FUNCIONA = [
  {
    passo: '01',
    titulo: 'Cadastre-se Grátis',
    desc: 'Crie sua conta em menos de 1 minuto. Não pedimos cartão de crédito para começar.'
  },
  {
    passo: '02',
    titulo: 'Personalize seu Link',
    desc: 'Configure seus serviços, horários e profissionais. Você ganha um link exclusivo para clientes.'
  },
  {
    passo: '03',
    titulo: 'Voe Alto',
    desc: 'Seus clientes agendam, o sistema avisa no WhatsApp e você foca em atender bem.'
  }
]

const FUNCIONALIDADES = [


  { 
    Icone: Calendar, 
    titulo: 'Agenda Inteligente 24h', 
    texto: 'Seus clientes agendam sozinhos via link, 24 horas por dia, sem precisar te ligar.' 
  },
  { 
    Icone: MessageCircle, 
    titulo: 'Lembretes via WhatsApp', 
    texto: 'Reduza faltas em até 40% com lembretes automáticos de confirmação de horário.' 
  },
  { 
    Icone: DollarSign, 
    titulo: 'Financeiro Sem Mistérios', 
    texto: 'Controle de caixa, comissões de profissionais e pagamentos em um só lugar.' 
  },
  { 
    Icone: BarChart3, 
    titulo: 'Relatórios de Performance', 
    texto: 'Saiba exatamente quanto você ganha e quais serviços são os mais lucrativos.' 
  },
  { 
    Icone: Users, 
    titulo: 'Gestão de Equipe', 
    texto: 'Controle permissões e acessos de cada colaborador de forma individual e segura.' 
  },
  { 
    Icone: Smartphone, 
    titulo: 'Tudo no Celular', 
    texto: 'Gerencie seu negócio de onde estiver com nossa interface 100% otimizada para mobile.' 
  },
] as const

const TESTEMUNHOS = [
  {
    nome: 'Juliana Silva',
    cargo: 'Dona do Studio J',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    texto: 'Minha vida mudou depois do HubBeleza. Antes eu perdia horas no WhatsApp marcando horários, agora meus clientes fazem tudo sozinhos e eu foco no serviço.',
    estrelas: 5
  },
  {
    nome: 'Ricardo Almeida',
    cargo: 'Proprietário da Barbearia Roots',
    foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
    texto: 'O controle de comissões era meu maior pesadelo. Com o sistema, tudo é calculado automaticamente. Meus profissionais adoram a transparência.',
    estrelas: 5
  },
  {
    nome: 'Mariana Costa',
    cargo: 'Esteticista',
    foto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    texto: 'As fichas de anamnese digitais são perfeitas. Tenho todo o histórico das minhas clientes na palma da mão. Profissionalismo puro!',
    estrelas: 5
  }
]

const FAQS = [
  {
    pergunta: 'Preciso instalar algum aplicativo?',
    resposta: 'Não! O HubBeleza é um sistema em nuvem. Você acessa diretamente pelo navegador do seu celular, tablet ou computador, sem ocupar espaço na memória.'
  },
  {
    pergunta: 'Como funciona o teste grátis?',
    resposta: 'Você pode criar sua conta agora e testar todas as funcionalidades do plano Pro por 7 dias, sem precisar cadastrar cartão de crédito.'
  },
  {
    pergunta: 'Posso cancelar a qualquer momento?',
    resposta: 'Com certeza. Não temos fidelidade ou taxas de cancelamento. Você paga apenas pelo mês que utilizar.'
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta: 'Utilizamos os mesmos protocolos de segurança de bancos digitais. Seus dados e os de seus clientes são criptografados e armazenados em servidores seguros.'
  }
]

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      {/* Background Decorativo */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[30%] w-[30%] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all">
        <nav className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="h-5 w-5" />
            </div>
            <span>Hub<span className="text-primary">Beleza</span></span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#funcionalidades" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#segmentos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Segmentos
            </a>
            <a href="#precos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:flex" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild className="hidden sm:flex shadow-elegant hover:shadow-glow transition-all">
              <Link to="/cadastro">Começar agora</Link>
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-4">
                  <a href="#funcionalidades" className="text-lg font-medium hover:text-primary transition-colors">
                    Funcionalidades
                  </a>
                  <a href="#segmentos" className="text-lg font-medium hover:text-primary transition-colors">
                    Segmentos
                  </a>
                  <a href="#precos" className="text-lg font-medium hover:text-primary transition-colors">
                    Preços
                  </a>
                  <Link to="/login" className="text-lg font-medium hover:text-primary transition-colors">
                    Entrar
                  </Link>
                  <Button asChild className="mt-4">
                    <Link to="/cadastro">Começar grátis</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-24 md:pb-32">
          <div className="container relative z-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="text-left">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                  <Zap className="h-4 w-4 fill-primary" />
                  <span>Da correria da rotina ao controle da gestão</span>
                </div>
                <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  Seu negócio de beleza <span className="text-primary italic">organizado</span> e mais <span className="text-primary">lucrativo</span>
                </h1>
                <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-xl leading-relaxed">
                  Dê adeus às complicações na agenda e finanças. Com o HubBeleza, sua gestão acontece num piscar de olhos. Experimente a liberdade de focar no que você ama.
                </p>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-elegant hover:scale-105 transition-all" asChild>
                    <Link to="/cadastro">
                      Teste Grátis Agora <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg hover:bg-muted" asChild>
                    <a href="#segmentos" className="flex items-center gap-2">
                      <Play className="h-4 w-4 fill-current" /> Ver Demos
                    </a>
                  </Button>
                </div>
                
                <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>7 dias grátis • Sem cartão de crédito</span>
                </div>
              </div>

              <div className="relative lg:ml-10">
                <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-tr from-primary/20 to-accent/20 blur-2xl pointer-events-none" />
                <div className="relative rounded-[2rem] border-8 border-slate-900/10 bg-slate-900/5 p-4 shadow-2xl overflow-hidden backdrop-blur-sm">
                  <div className="relative aspect-[12/16] md:aspect-video overflow-hidden rounded-2xl bg-background border border-border/50">
                    {/* Mockup do App */}
                    <div className="absolute inset-0 flex flex-col">
                      <div className="flex h-10 items-center gap-2 border-b bg-muted/30 px-4">
                        <div className="flex gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                      <div className="flex flex-1 overflow-hidden">
                        <div className="w-12 border-r bg-muted/10 md:w-40">
                          <div className="space-y-3 p-3">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className="h-3 w-full rounded bg-muted/40" />
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 p-4 md:p-6">
                          <div className="flex justify-between items-center mb-6">
                            <div className="h-4 w-32 rounded bg-muted/40" />
                            <div className="flex gap-2">
                              <div className="h-8 w-8 rounded bg-primary/10" />
                              <div className="h-8 w-8 rounded bg-primary/10" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="h-24 rounded-xl border bg-card p-4 shadow-sm">
                              <div className="h-3 w-1/2 rounded bg-muted/40" />
                              <div className="mt-3 h-6 w-3/4 rounded bg-primary/20" />
                            </div>
                            <div className="h-24 rounded-xl border bg-card p-4 shadow-sm">
                              <div className="h-3 w-1/2 rounded bg-muted/40" />
                              <div className="mt-3 h-6 w-3/4 rounded bg-emerald-500/20" />
                            </div>
                          </div>
                          <div className="mt-6 h-40 rounded-xl border bg-card p-4 shadow-sm overflow-hidden">
                             <div className="grid grid-cols-7 gap-1.5 opacity-40">
                               {[...Array(28)].map((_, i) => (
                                 <div key={i} className="h-8 rounded bg-muted/20" />
                               ))}
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LOGOS TRUST */}
            <div className="mt-24 border-t border-border/50 pt-12">
              <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">
                Utilizado e aprovado por profissionais de
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-40 grayscale">
                <span className="text-2xl font-black italic tracking-tighter">L'ORÉAL</span>
                <span className="text-2xl font-black italic tracking-tighter">WELLA</span>
                <span className="text-2xl font-black italic tracking-tighter">KEUNE</span>
                <span className="text-2xl font-black italic tracking-tighter">PANTENE</span>
                <span className="text-2xl font-black italic tracking-tighter">AVEDA</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="bg-primary py-16 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 skew-x-[30deg] translate-x-1/2" />
          <div className="container relative z-10">
            <div className="grid gap-12 text-center sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-5xl font-black tracking-tighter">+10.000</div>
                <div className="text-primary-foreground/80 font-medium">Profissionais no Brasil</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black tracking-tighter">2 MILHÕES</div>
                <div className="text-primary-foreground/80 font-medium">Agendamentos realizados</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black tracking-tighter">4.9/5</div>
                <div className="text-primary-foreground/80 font-medium">Avaliação média dos usuários</div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMAS SECTION */}
        <section className="py-24 bg-muted/20">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                Cansado de perder tempo com <span className="text-primary">processos manuais</span>?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Se você ainda usa agenda de papel ou passa o dia respondendo WhatsApp para marcar horários, você está deixando dinheiro na mesa.
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  titulo: 'Agenda Lotada, Cabeça Vazia',
                  desc: 'Clientes esquecendo horários e buracos na sua agenda que poderiam ser faturamento.',
                  Icone: Clock
                },
                {
                  titulo: 'Caos Financeiro',
                  desc: 'Não saber exatamente quanto lucrou no fim do mês ou se as comissões estão certas.',
                  Icone: BarChart3
                },
                {
                  titulo: 'Escravo do WhatsApp',
                  desc: 'Parar o que está fazendo a cada 5 minutos para responder dúvidas básicas de horários.',
                  Icone: MessageCircle
                }
              ].map((item, i) => (
                <div key={i} className="group relative rounded-2xl border bg-background p-8 hover:border-primary/50 transition-colors">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <item.Icone className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.titulo}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES SECTION */}
        <section id="funcionalidades" className="py-24 relative overflow-hidden">
          <div className="container">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <div className="relative order-2 lg:order-1">
                <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] blur-2xl -z-10" />
                <div className="relative rounded-2xl border bg-card p-2 shadow-2xl">
                   <div className="overflow-hidden rounded-xl border bg-background">
                      <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h4 className="text-xl font-bold">Resumo Mensal</h4>
                            <p className="text-sm text-muted-foreground">Studio Beleza F3</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">+18% vs mês ant.</span>
                        </div>
                        <div className="space-y-6">
                           {[
                             { nome: 'Corte & Escova', valor: 'R$ 4.850', icon: Scissors, color: 'bg-rose-500' },
                             { nome: 'Coloração', valor: 'R$ 3.200', icon: Sparkles, color: 'bg-primary' },
                             { nome: 'Manicure', valor: 'R$ 1.950', icon: Brush, color: 'bg-orange-500' },
                           ].map((item, i) => (
                             <div key={i} className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white ${item.color} shadow-lg`}>
                                  <item.icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-bold">{item.nome}</div>
                                  <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                                    <div className="h-full bg-current opacity-20" style={{ width: `${80 - i*20}%` }} />
                                  </div>
                                </div>
                                <div className="font-black">{item.valor}</div>
                             </div>
                           ))}
                        </div>
                        <Button className="w-full mt-8" variant="outline">Ver Relatórios Completos</Button>
                      </div>
                   </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl mb-6 leading-tight">
                  Tudo o que você precisa em <span className="text-primary">um só lugar</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-12">
                  Desenvolvemos ferramentas robustas com foco na simplicidade. Você não precisa ser um expert em tecnologia para gerenciar seu negócio como um profissional.
                </p>
                
                <div className="grid gap-8 sm:grid-cols-2">
                  {FUNCIONALIDADES.map(({ Icone, titulo, texto }) => (
                    <div key={titulo} className="flex gap-4 group">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border shadow-sm text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <Icone className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{titulo}</h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEGMENTOS SECTION */}
        <section id="segmentos" className="py-24 bg-muted/30">
          <div className="container text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              Feito para o seu <span className="text-primary italic">estilo de negócio</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-lg">
              Escolha seu segmento e veja como o HubBeleza se adapta perfeitamente à sua realidade.
            </p>
            
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {SEGMENTOS.map(({ slug, nome, descricao, Icone, cor, iconeCor }) => (
                <Link
                  key={slug}
                  to={`/demo/${slug}`}
                  className={`group relative flex flex-col items-center text-center rounded-2xl border-2 p-8 transition-all hover:-translate-y-2 hover:shadow-2xl ${cor}`}
                >
                  <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:rotate-12 group-hover:scale-110 ${iconeCor}`}>
                    <Icone className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">{nome}</h3>
                  <p className="mt-3 text-sm opacity-70 leading-relaxed">{descricao}</p>
                  <div className="mt-6 flex items-center text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Testar Demo <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* TESTEMUNHOS SECTION */}
        <section className="py-24 overflow-hidden">
          <div className="container">
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-5xl mb-16">
              O que dizem nossos <span className="text-primary">clientes</span>
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {TESTEMUNHOS.map((test, i) => (
                <Card key={i} className="bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-6">
                      {[...Array(test.estrelas)].map((_, j) => (
                        <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-lg italic text-muted-foreground leading-relaxed mb-8">
                      "{test.texto}"
                    </p>
                    <div className="flex items-center gap-4">
                      <img 
                        src={test.foto} 
                        alt={test.nome} 
                        className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
                      />
                      <div>
                        <div className="font-bold">{test.nome}</div>
                        <div className="text-sm text-muted-foreground">{test.cargo}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="precos" className="py-24 bg-muted/20 relative">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Planos para todos os tamanhos</h2>
              <p className="mt-4 text-muted-foreground text-lg">Comece grátis e evolua conforme o seu sucesso cresce. Sem pegadinhas.</p>
            </div>
            
            <div className="mt-16 mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              <Card className="flex flex-col border-2 border-transparent transition-all hover:border-primary/20 bg-background/50">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl">Plano Individual</CardTitle>
                  <CardDescription>Ideal para profissionais liberais</CardDescription>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-black">R$ 49</span>
                    <span className="text-muted-foreground font-medium">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-8 pt-0">
                  <ul className="space-y-4 flex-1">
                    {[
                      'Até 100 agendamentos/mês',
                      '1 Profissional (você)',
                      'Agendamento Online 24h',
                      'Lembretes via WhatsApp',
                      'Relatórios Básicos',
                      'Suporte via Chat'
                    ].map(feature => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-10 h-12 w-full font-bold" variant="outline" asChild>
                    <Link to="/cadastro">Começar agora</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="relative flex flex-col border-2 border-primary shadow-2xl scale-105 bg-background">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-6 py-1.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg">
                  RECOMENDADO
                </div>
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl">Plano Studio / Pro</CardTitle>
                  <CardDescription>Para times e negócios em expansão</CardDescription>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-black">R$ 89</span>
                    <span className="text-muted-foreground font-bold">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-8 pt-0">
                  <ul className="space-y-4 flex-1">
                    {[
                      'Agendamentos Ilimitados',
                      'Profissionais Ilimitados',
                      'Lembretes WhatsApp (Ilimitados)',
                      'Financeiro Completo & Fluxo',
                      'Cálculo de Comissões Automático',
                      'Gestão de Estoque',
                      'Relatórios Avançados',
                      'Suporte Prioritário VIP'
                    ].map(feature => (
                      <li key={feature} className="flex items-center gap-3 text-sm font-medium">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-10 h-14 w-full text-lg font-black shadow-elegant hover:shadow-glow transition-all" asChild>
                    <Link to="/cadastro">Experimentar 7 dias grátis</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <p className="text-center mt-12 text-sm text-muted-foreground">
              Precisa de algo sob medida? <a href="#" className="text-primary font-bold hover:underline">Fale com um especialista</a>
            </p>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-24 container">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-tight md:text-5xl mb-12">
              Perguntas <span className="text-primary">Frequentes</span>
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b-border/50">
                  <AccordionTrigger className="text-left text-lg font-bold hover:text-primary transition-colors py-6">
                    {faq.pergunta}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {faq.resposta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="container py-24">
          <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 px-8 py-16 text-center text-white md:py-24 shadow-2xl">
            <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.4),transparent)]" />
            <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.4),transparent)]" />
            
            <div className="relative z-10">
              <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl max-w-4xl mx-auto leading-tight">
                Pronto para levar seu negócio ao <span className="text-primary italic">próximo nível</span>?
              </h2>
              <p className="mx-auto mt-8 max-w-2xl text-xl text-slate-300 leading-relaxed">
                Junte-se a mais de 10.000 profissionais que já transformaram seu dia a dia com o HubBeleza. Modernidade, controle e lucro garantidos.
              </p>
              <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
                <Button size="lg" className="h-16 px-10 text-xl font-black bg-white text-slate-900 hover:bg-slate-200 transition-all shadow-xl" asChild>
                  <Link to="/cadastro">Criar minha conta grátis</Link>
                </Button>
                <Button size="lg" variant="ghost" className="h-16 px-10 text-xl font-bold text-white hover:bg-white/10" asChild>
                  <Link to="/login">Falar com um consultor</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/40?img=${i+10}`} className="h-8 w-8 rounded-full border-2 border-slate-900" alt="Avatar" />
                  ))}
                </div>
                <span className="text-sm">+ de 150 novos negócios essa semana</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 dark:bg-slate-950/40 pt-24 pb-12 border-t">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-4 lg:grid-cols-5">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scissors className="h-5 w-5" />
                </div>
                <span>Hub<span className="text-primary">Beleza</span></span>
              </Link>
              <p className="mt-6 max-w-sm text-lg text-muted-foreground leading-relaxed">
                O ecossistema definitivo para gestão de negócios de beleza e bem-estar no Brasil. Modernidade, agilidade e inteligência para você crescer.
              </p>
              <div className="mt-8 flex gap-4">
                <a href="#" className="h-10 w-10 flex items-center justify-center rounded-full bg-background border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="h-10 w-10 flex items-center justify-center rounded-full bg-background border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="h-10 w-10 flex items-center justify-center rounded-full bg-background border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm">
                  <Twitter className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">Soluções</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li><Link to="/demo/salao" className="hover:text-primary transition-colors">Salão de Beleza</Link></li>
                <li><Link to="/demo/barbearia" className="hover:text-primary transition-colors">Barbearias</Link></li>
                <li><Link to="/demo/estetica" className="hover:text-primary transition-colors">Clínicas de Estética</Link></li>
                <li><Link to="/demo/manicure" className="hover:text-primary transition-colors">Esmalterias</Link></li>
                <li><Link to="/demo/tatuagem" className="hover:text-primary transition-colors">Studios de Tattoo</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Produto</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li><a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#precos" className="hover:text-primary transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog & Dicas</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Empresa</h4>
              <ul className="space-y-4 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t flex flex-col items-center justify-between gap-6 md:flex-row text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} HubBeleza. Todos os direitos reservados. Feito com ❤️ no Brasil.</p>
            <div className="flex items-center gap-8">
              <span>Tecnologia de ponta</span>
              <span>Segurança garantida</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
