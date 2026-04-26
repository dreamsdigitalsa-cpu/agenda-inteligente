'use client'

import { useState } from 'react'
import { 
  Rocket, 
  ShieldCheck, 
  CreditCard, 
  History, 
  Zap, 
  AlertCircle,
  HelpCircle,
  RefreshCcw,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { usePermissao } from '@/hooks/usePermissao'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CardPlano } from '@/componentes/assinatura/CardPlano'
import { ModalEscolherGateway } from '@/componentes/assinatura/ModalEscolherGateway'
import { HistoricoFaturas } from '@/componentes/assinatura/HistoricoFaturas'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PaginaAssinatura = () => {
  const { tenant } = useTenant()
  const { temPermissao } = usePermissao()
  const { toast } = useToast()
  
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null)
  const [modalGateway, setModalGateway] = useState(false)

  const temAcesso = temPermissao('PERM-012')

  // 1. Dados da Assinatura Atual
  const { data: assinatura, isLoading: carregandoAssinatura, refetch: refetchAssinatura } = useQuery({
    queryKey: ['assinatura-tenant', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assinaturas_tenant')
        .select('*, planos(*)')
        .eq('tenant_id', tenant?.id)
        .maybeSingle()
      
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id
  })

  // 2. Planos Disponíveis
  const { data: planos, isLoading: carregandoPlanos } = useQuery({
    queryKey: ['planos-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('preco', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  // 3. Histórico de Faturas
  const { data: faturas, isLoading: carregandoFaturas } = useQuery({
    queryKey: ['faturas-tenant', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturas')
        .select('*')
        .eq('tenant_id', tenant?.id)
        .order('vencimento', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id
  })

  // 4. Mutação para Criar Checkout
  const mutationCheckout = useMutation({
    mutationFn: async (gateway: string) => {
      const { data, error } = await supabase.functions.invoke('assinatura-criar-checkout', {
        body: { plano_id: planoSelecionado, gateway }
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast({ title: 'Sucesso!', description: 'Siga as instruções para completar o pagamento.' })
        setModalGateway(false)
        refetchAssinatura()
      }
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao processar', 
        description: error.message || 'Tente novamente mais tarde.' 
      })
    }
  })

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (carregandoAssinatura || carregandoPlanos) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    )
  }

  const isTrial = assinatura?.status === 'trial'
  const diasRestantesTrial = assinatura?.fim_trial ? differenceInDays(new Date(assinatura.fim_trial), new Date()) : 0

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Minha Assinatura</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu plano e visualize seu histórico de pagamentos.</p>
        </div>
        {assinatura?.status === 'ativa' && (
          <Badge variant="success" className="rounded-full px-4 py-1 text-sm font-semibold">
            Assinatura Ativa
          </Badge>
        )}
      </header>

      {/* Alerta de Trial */}
      {isTrial && (
        <Alert className="bg-primary/10 border-primary/20 rounded-3xl p-6">
          <Zap className="h-6 w-6 text-primary" />
          <div className="ml-4">
            <AlertTitle className="text-lg font-bold">Período de Teste Gratuito</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Você ainda tem <strong>{diasRestantesTrial} dias</strong> de acesso completo. Assine um plano agora para evitar interrupções no seu negócio.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Grid de Planos */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Planos Disponíveis</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {planos?.map((plano) => (
            <CardPlano
              key={plano.id}
              id={plano.id}
              nome={plano.nome}
              preco={plano.preco}
              descricao={plano.descricao}
              features={plano.features}
              emUso={assinatura?.plano_id === plano.id}
              selecionado={planoSelecionado === plano.id}
              onSelecionar={(id) => {
                if (!temAcesso) {
                  toast({ variant: 'destructive', title: 'Acesso negado', description: 'Você não tem permissão para alterar planos.' })
                  return
                }
                setPlanoSelecionado(id)
                setModalGateway(true)
              }}
            />
          ))}
        </div>
      </section>

      {/* Detalhes da Assinatura Atual */}
      {assinatura && !isTrial && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border-none shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Resumo da Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Plano Atual:</span>
                <span className="font-bold">{assinatura.planos?.nome}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Gateway:</span>
                <span className="font-bold uppercase">{assinatura.gateway}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Próxima Cobrança:</span>
                <span className="font-bold">
                  {assinatura.proxima_cobranca ? format(new Date(assinatura.proxima_cobranca), 'dd/MM/yyyy') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Método de Pagamento:</span>
                <div className="flex items-center gap-2 font-bold">
                  <CreditCard className="h-4 w-4" />
                  <span>•••• {assinatura.metodo_pagamento?.last4 || '****'}</span>
                </div>
              </div>
              <div className="pt-4 flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full flex-1">
                  <RefreshCcw className="h-4 w-4 mr-2" /> Alterar Método
                </Button>
                <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 flex-1">
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Últimas Faturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HistoricoFaturas faturas={faturas || []} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ajuda */}
      <footer className="flex items-center justify-center p-8 text-center text-muted-foreground">
        <div className="max-w-md space-y-2">
          <HelpCircle className="h-6 w-6 mx-auto opacity-50" />
          <h3 className="font-semibold text-foreground">Precisa de ajuda com sua assinatura?</h3>
          <p className="text-sm">
            Nossa equipe de suporte está pronta para te auxiliar com dúvidas sobre planos, faturas ou métodos de pagamento.
          </p>
          <Button variant="link" className="text-primary font-bold">Falar com suporte agora</Button>
        </div>
      </footer>

      <ModalEscolherGateway 
        aberto={modalGateway}
        onFechar={() => setModalGateway(false)}
        onConfirmar={(gateway) => mutationCheckout.mutate(gateway)}
        carregando={mutationCheckout.isPending}
      />
    </div>
  )
}

export default PaginaAssinatura
