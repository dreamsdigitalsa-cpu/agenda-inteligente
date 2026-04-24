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
} from 'lucide-react'

const SEGMENTOS = [
  {
    slug: 'salao',
    nome: 'Salão de Beleza',
    descricao: 'Gestão completa de serviços e profissionais',
    Icone: Scissors,
    cor: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100',
    iconeCor: 'bg-rose-500 text-white',
  },
  {
    slug: 'barbearia',
    nome: 'Barbearia',
    descricao: 'Agendamentos e controle de cadeiras',
    Icone: Sparkles,
    cor: 'bg-slate-50 text-slate-800 border-slate-100 hover:bg-slate-100',
    iconeCor: 'bg-slate-800 text-white',
  },
  {
    slug: 'estetica',
    nome: 'Estética',
    descricao: 'Anamnese e evolução de tratamentos',
    Icone: Leaf,
    cor: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    iconeCor: 'bg-emerald-600 text-white',
  },
  {
    slug: 'tatuagem',
    nome: 'Tatuagem',
    descricao: 'Orçamentos e gestão de sessões',
    Icone: Palette,
    cor: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100',
    iconeCor: 'bg-purple-600 text-white',
  },
  {
    slug: 'manicure',
    nome: 'Manicure',
    descricao: 'Agendamentos e controle de produtos',
    Icone: Brush,
    cor: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100',
    iconeCor: 'bg-orange-500 text-white',
  },
] as const

const FUNCIONALIDADES = [
  { Icone: Calendar, titulo: 'Agendamento online 24h', texto: 'Seus clientes marcam horário a qualquer momento, direto do celular.' },
  { Icone: DollarSign, titulo: 'Controle financeiro', texto: 'Caixa, comissões, despesas e relatórios em tempo real.' },
  { Icone: Users, titulo: 'Múltiplos profissionais', texto: 'Cada profissional com sua agenda, comissão e permissões.' },
  { Icone: MessageCircle, titulo: 'WhatsApp Automático', texto: 'Confirmações e lembretes enviados automaticamente via WhatsApp.' },
  { Icone: BarChart3, titulo: 'Inteligência de Dados', texto: 'Relatórios automáticos sobre faturamento, ticket médio e ocupação.' },
  { Icone: Smartphone, titulo: 'Interface Intuitiva', texto: 'Design moderno e fácil de usar, adaptado para qualquer dispositivo.' },
] as const

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      {/* Background Decorativo */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
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
            <a href="#precos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:flex" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro">Começar grátis</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="container relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                  <Star className="h-4 w-4 fill-current" />
                  <span>Sistema #1 para Gestão de Beleza no Brasil</span>
                </div>
                <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl">
                  Transforme a gestão do seu <span className="text-primary">negócio de beleza</span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                  Agendamentos online, controle financeiro automático e gestão de clientes. 
                  Tudo o que você precisa em uma única plataforma moderna e rápida.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button size="lg" className="h-14 px-8 text-lg" asChild>
                    <Link to="/cadastro">
                      Começar agora <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg" asChild>
                    <a href="#segmentos">Ver demonstração</a>
                  </Button>
                </div>
                
                <div className="mt-12 flex items-center justify-center gap-8 grayscale opacity-50">
                  <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Utilizado por:</div>
                  <div className="flex gap-6">
                    <span className="text-xl font-bold italic">L'Oréal</span>
                    <span className="text-xl font-bold italic">Wella</span>
                    <span className="text-xl font-bold italic">Keune</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20 flex justify-center">
              <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-background p-4 shadow-[0_0_50px_-12px_rgba(0,0,0,0.1)] md:p-6">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted/30 border border-border">
                  {/* Mockup do App */}
                  <div className="absolute inset-0 flex flex-col">
                    <div className="flex h-12 items-center gap-2 border-b bg-background px-4">
                      <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-rose-400" />
                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                        <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      </div>
                      <div className="ml-4 h-6 w-1/3 rounded-md bg-muted/50" />
                    </div>
                    <div className="flex flex-1 overflow-hidden">
                      <div className="w-16 border-r bg-muted/20 md:w-48">
                        <div className="space-y-4 p-4">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-4 w-full rounded bg-muted/40" />
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 p-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-xl border bg-background p-4 shadow-sm">
                              <div className="h-4 w-1/2 rounded bg-muted/40" />
                              <div className="mt-4 h-8 w-3/4 rounded bg-primary/10" />
                            </div>
                          ))}
                        </div>
                        <div className="mt-8 h-64 rounded-xl border bg-background p-4 shadow-sm">
                           <div className="flex justify-between items-center mb-6">
                              <div className="h-4 w-32 rounded bg-muted/40" />
                              <div className="h-8 w-24 rounded bg-primary text-white text-xs flex items-center justify-center font-bold">Agenda +</div>
                           </div>
                           <div className="grid grid-cols-7 gap-2">
                             {[...Array(21)].map((_, i) => (
                               <div key={i} className="h-10 rounded bg-muted/10 border" />
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
        </section>

        {/* STATS SECTION */}
        <section className="bg-primary py-12 text-primary-foreground">
          <div className="container grid gap-8 text-center sm:grid-cols-3">
            <div>
              <div className="text-4xl font-bold">+10k</div>
              <div className="text-primary-foreground/70">Profissionais ativos</div>
            </div>
            <div>
              <div className="text-4xl font-bold">2M+</div>
              <div className="text-primary-foreground/70">Agendamentos realizados</div>
            </div>
            <div>
              <div className="text-4xl font-bold">99.9%</div>
              <div className="text-primary-foreground/70">Satisfação garantida</div>
            </div>
          </div>
        </section>

        {/* SEGMENTOS SECTION */}
        <section id="segmentos" className="py-24">
          <div className="container text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              Feito para o seu <span className="text-primary">estilo de negócio</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-lg">
              Soluções personalizadas para cada segmento do mercado de beleza e bem-estar.
            </p>
            
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {SEGMENTOS.map(({ slug, nome, descricao, Icone, cor, iconeCor }) => (
                <Link
                  key={slug}
                  to={`/demo/${slug}`}
                  className={`group relative flex flex-col items-center text-center rounded-2xl border-2 p-8 transition-all hover:-translate-y-2 hover:shadow-2xl ${cor}`}
                >
                  <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${iconeCor}`}>
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

        {/* FUNCIONALIDADES SECTION */}
        <section id="funcionalidades" className="bg-muted/30 py-24">
          <div className="container">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Tudo o que você precisa <br />em um só lugar
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Desenvolvemos ferramentas robustas para que você foque no que realmente importa: 
                  cuidar dos seus clientes e fazer seu negócio crescer.
                </p>
                
                <div className="mt-12 grid gap-8 sm:grid-cols-2">
                  {FUNCIONALIDADES.map(({ Icone, titulo, texto }) => (
                    <div key={titulo} className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border shadow-sm text-primary">
                        <Icone className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold">{titulo}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-full bg-primary/5 blur-3xl absolute inset-0" />
                <div className="relative rounded-2xl border bg-card p-2 shadow-2xl">
                   <div className="overflow-hidden rounded-xl border bg-background">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-lg font-bold">Fluxo de Caixa</h4>
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">+12.5% este mês</span>
                        </div>
                        <div className="space-y-4">
                           {[1, 2, 3, 4].map(i => (
                             <div key={i} className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${i % 2 === 0 ? 'bg-primary' : 'bg-accent-foreground'}`}>
                                  <Users className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="h-3 w-24 rounded bg-muted/60 mb-1" />
                                  <div className="h-2 w-16 rounded bg-muted/30" />
                                </div>
                                <div className="font-bold">R$ {i * 120},00</div>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="precos" className="py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Planos para todos os momentos</h2>
              <p className="mt-4 text-muted-foreground text-lg">Comece grátis e evolua conforme o seu negócio cresce.</p>
            </div>
            
            <div className="mt-16 mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              <Card className="flex flex-col border-2 border-transparent transition-all hover:border-primary/20">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl">Plano Free</CardTitle>
                  <CardDescription>Para profissionais individuais</CardDescription>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">Grátis</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-8 pt-0">
                  <ul className="space-y-4 flex-1">
                    {[
                      'Até 50 agendamentos/mês',
                      '1 Profissional',
                      'Agendamento Online',
                      'Cadastro de Clientes',
                      'Suporte via Chat'
                    ].map(feature => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-10 h-12 w-full" variant="outline" asChild>
                    <Link to="/cadastro">Começar grátis</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="relative flex flex-col border-2 border-primary shadow-2xl scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  Mais escolhido
                </div>
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl">Plano Pro</CardTitle>
                  <CardDescription>Para negócios em expansão</CardDescription>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ 89</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-8 pt-0">
                  <ul className="space-y-4 flex-1">
                    {[
                      'Agendamentos Ilimitados',
                      'Profissionais Ilimitados',
                      'Financeiro Completo',
                      'WhatsApp Automático',
                      'Relatórios Avançados',
                      'Suporte Prioritário'
                    ].map(feature => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span className="font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-10 h-12 w-full shadow-lg shadow-primary/20" asChild>
                    <Link to="/cadastro">Experimentar 7 dias grátis</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="container py-24">
          <div className="rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:py-24">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Pronto para modernizar seu negócio?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80 md:text-xl">
              Junte-se a milhares de profissionais que já transformaram seu dia a dia com o HubBeleza.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold" asChild>
                <Link to="/cadastro">Criar minha conta grátis</Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-14 px-8 text-lg text-primary-foreground hover:bg-white/10" asChild>
                <Link to="/login">Falar com um consultor</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 md:py-20">
        <div className="container grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
                <Scissors className="h-4 w-4" />
              </div>
              <span>Hub<span className="text-primary">Beleza</span></span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              O ecossistema completo para gestão de beleza e bem-estar. 
              Modernidade e praticidade para o seu negócio.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a></li>
              <li><a href="#precos" className="hover:text-primary transition-colors">Preços</a></li>
              <li><Link to="/demo/salao" className="hover:text-primary transition-colors">Demonstração</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
            </ul>
          </div>
        </div>
        <div className="container mt-12 pt-8 border-t border-border/40 flex flex-col items-center justify-between gap-4 md:flex-row text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} HubBeleza. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Instagram</a>
            <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage