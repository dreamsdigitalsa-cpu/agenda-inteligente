// Painel: configurações do tenant (layout com tabs verticais).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  CreditCard,
  Lock,
  Phone,
  Shield,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AbaEstabelecimento } from '@/componentes/configuracoes/AbaEstabelecimento'
import { AbaMeuPerfil } from '@/componentes/configuracoes/AbaMeuPerfil'
import { AbaSeguranca } from '@/componentes/configuracoes/AbaSeguranca'

const ABAS = [
  { id: 'geral', icone: Building2, rotulo: 'Estabelecimento' },
  { id: 'perfil', icone: User, rotulo: 'Meu perfil' },
  { id: 'notificacoes', icone: Bell, rotulo: 'Notificações', rota: '/painel/configuracoes/notificacoes' },
  { id: 'ligacao-ia', icone: Phone, rotulo: 'Ligação IA', rota: '/painel/configuracoes/ligacao-ia' },
  { id: 'seguranca', icone: Lock, rotulo: 'Segurança' },
  { id: 'permissoes', icone: Shield, rotulo: 'Permissões' },
  { id: 'assinatura', icone: CreditCard, rotulo: 'Assinatura', rota: '/painel/assinatura' },
] as const

type AbaId = (typeof ABAS)[number]['id']

const PaginaConfiguracoes = () => {
  const navigate = useNavigate()
  const [aba, setAba] = useState<AbaId>('geral')

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize seu estabelecimento, perfil e preferências do sistema.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Tabs verticais */}
        <nav className="space-y-1">
          {ABAS.map((a) => {
            const Ic = a.icone
            const ativo = aba === a.id
            return (
              <button
                key={a.id}
                onClick={() => {
                  if ('rota' in a && a.rota) navigate(a.rota)
                  else setAba(a.id)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  ativo
                    ? 'bg-accent text-accent-foreground shadow-card'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <Ic className="h-4 w-4" />
                {a.rotulo}
              </button>
            )
          })}
        </nav>

        {/* Conteúdo */}
        <div className="space-y-4">
          {aba === 'geral' && (
            <Card className="rounded-2xl border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-primary" /> Estabelecimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>Em breve: nome, segmento, horário de funcionamento, endereço, logotipo e redes sociais.</p>
                <Button variant="outline" className="rounded-full">
                  <Settings className="mr-1.5 h-4 w-4" />
                  Configurar agora
                </Button>
              </CardContent>
            </Card>
          )}

          {aba === 'perfil' && (
            <Card className="rounded-2xl border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Meu perfil</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Em breve: nome de exibição, foto, telefone de contato e preferências pessoais.
              </CardContent>
            </Card>
          )}

          {aba === 'seguranca' && (
            <Card className="rounded-2xl border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Segurança</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Em breve: alterar senha, autenticação em dois fatores, sessões ativas.
              </CardContent>
            </Card>
          )}

          {aba === 'permissoes' && (
            <Card className="rounded-2xl border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Permissões</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Gerencie perfis e acessos da equipe.
                <div className="mt-3">
                  <Button onClick={() => navigate('/painel/configuracoes/permissoes')} className="rounded-full bg-gradient-primary shadow-elegant">
                    Abrir gestão de permissões
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaginaConfiguracoes
