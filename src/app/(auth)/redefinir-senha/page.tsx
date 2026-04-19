// Tela de redefinição de senha.
// Para onde o link de recuperação enviado por e-mail aponta.
// O Supabase coloca o token de recovery na URL (hash) e o SDK
// processa automaticamente, criando uma sessão temporária só
// para permitir a chamada updateUser({ password }).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const RedefinirSenha = () => {
  const navegar = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sessaoPronta, setSessaoPronta] = useState(false)

  // Aguarda o Supabase processar o token de recovery presente na URL.
  // Sem sessão de recovery o updateUser falha — então só liberamos o
  // formulário depois que o evento PASSWORD_RECOVERY chegar (ou se já
  // houver uma sessão ativa equivalente).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoPronta(true)
    })
    const { data: assinatura } = supabase.auth.onAuthStateChange((evt, sessao) => {
      if (evt === 'PASSWORD_RECOVERY' || sessao) setSessaoPronta(true)
    })
    return () => assinatura.subscription.unsubscribe()
  }, [])

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (senha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      toast.error('As senhas não coincidem.')
      return
    }
    setEnviando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Senha redefinida com sucesso!')
      // Encerra a sessão de recovery e força login com a nova senha
      await supabase.auth.signOut()
      navegar('/login')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent>
          {!sessaoPronta ? (
            <p className="text-sm text-muted-foreground">
              Validando link de recuperação… Se você abriu esta página direto, volte
              para <Link to="/recuperar-senha" className="text-primary underline">recuperar senha</Link>.
            </p>
          ) : (
            <form onSubmit={submeter} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nova senha (mín. 8 caracteres)</label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirmar nova senha</label>
                <Input
                  type="password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                <Link to="/login" className="text-primary underline">Voltar para o login</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RedefinirSenha
