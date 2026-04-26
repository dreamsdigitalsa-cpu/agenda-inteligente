import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function PaginaAceitarConvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [convite, setConvite] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Token de convite não fornecido')
      setLoading(false)
      return
    }

    const verificarConvite = async () => {
      const { data, error } = await supabase
        .from('convites_usuario')
        .select('*, tenants(nome)')
        .eq('token', token)
        .eq('status', 'pendente')
        .gt('expira_em', new Date().toISOString())
        .single()

      if (error || !data) {
        toast.error('Convite inválido ou expirado')
        setLoading(false)
        return
      }

      setConvite(data)
      setLoading(false)
    }

    verificarConvite()
  }, [token])

  const handleAceitar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (senha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: convite.email,
        password: senha,
        options: {
          data: {
            full_name: nome,
            tenant_id: convite.tenant_id,
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Erro ao criar usuário')

      // 2. Criar perfil na tabela usuarios (o trigger handle_new_user pode já fazer isso, mas vamos garantir)
      // Nota: Dependendo da configuração do Supabase, o trigger handle_new_user 
      // precisaria estar ciente do tenant_id vindo do metadata.
      
      // 3. Atualizar convite
      const { error: updateError } = await supabase
        .from('convites_usuario')
        .update({ 
          status: 'aceito',
          utilizado_em: new Date().toISOString()
        })
        .eq('id', convite.id)

      if (updateError) throw updateError

      setSucesso(true)
      toast.success('Conta criada com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao aceitar convite: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Tudo pronto!</CardTitle>
            <CardDescription>
              Sua conta foi criada e você já faz parte do time da <strong>{convite?.tenants?.nome}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!convite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Ops! Convite inválido</CardTitle>
            <CardDescription>
              Este link de convite pode ter expirado ou já foi utilizado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Você foi convidado!</CardTitle>
          <CardDescription>
            Crie sua conta para acessar o sistema da <strong>{convite.tenants?.nome}</strong> como {convite.role}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAceitar} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input value={convite.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome completo</label>
              <Input 
                placeholder="Seu nome" 
                value={nome} 
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar senha</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar minha conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
