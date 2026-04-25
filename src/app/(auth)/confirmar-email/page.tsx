import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function ConfirmarEmail() {
  const navegar = useNavigate()
  const [estado, setEstado] = useState<'processando' | 'sucesso' | 'erro'>('processando')
  const [mensagem, setMensagem] = useState('Confirmando seu e-mail...')
  
  useEffect(() => {
    const processar = async () => {
      // 1) Garante que a sessão foi estabelecida pelo Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setEstado('erro')
        setMensagem('Não foi possível confirmar o e-mail. Faça login manualmente.')
        setTimeout(() => navegar('/login'), 3000)
        return
      }
      
      // 2) Verifica se o tenant já foi criado (idempotência)
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('tenant_id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()
      
      if (usuarioExistente?.tenant_id) {
        setEstado('sucesso')
        setMensagem('E-mail já confirmado. Redirecionando...')
        setTimeout(() => navegar('/painel/agenda'), 1500)
        return
      }
      
      // 3) Lê os dados do estabelecimento do user_metadata
      const meta = session.user.user_metadata
      const nome = meta?.nome
      const nomeEstabelecimento = meta?.nomeEstabelecimento
      const segmento = meta?.segmento
      
      if (!nome || !nomeEstabelecimento || !segmento) {
        setEstado('erro')
        setMensagem('Dados do cadastro incompletos. Entre em contato com o suporte.')
        return
      }
      
      // 4) Chama criar-tenant agora que há sessão ativa
      const { error: errFn } = await supabase.functions.invoke('criar-tenant', {
        body: { nomeEstabelecimento, segmento, nomeAdmin: nome },
      })
      
      if (errFn) {
        setEstado('erro')
        setMensagem('Erro ao configurar o estabelecimento. Tente novamente em alguns minutos.')
        toast.error('Falha ao configurar estabelecimento.')
        return
      }
      
      setEstado('sucesso')
      setMensagem('E-mail confirmado! Redirecionando para o onboarding...')
      setTimeout(() => navegar('/onboarding'), 1500)
    }
    
    processar()
  }, [navegar])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
          {estado === 'processando' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {estado === 'sucesso' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
          {estado === 'erro' && <XCircle className="h-12 w-12 text-destructive" />}
          <p className="text-base">{mensagem}</p>
        </CardContent>
      </Card>
    </div>
  )
}
