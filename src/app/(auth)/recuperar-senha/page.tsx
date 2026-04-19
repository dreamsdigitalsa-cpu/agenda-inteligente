// Tela de recuperação de senha.
// Envia link de reset via Supabase Auth. O link aponta para
// /redefinir-senha (página pública que ainda será criada).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const RecuperarSenha = () => {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setEnviado(true)
      toast.success('Verifique seu e-mail para redefinir a senha.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="space-y-4 text-sm">
              <p>Enviamos um link de recuperação para <strong>{email}</strong>.</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submeter} className="space-y-4">
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar link de recuperação'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                <Link to="/login" className="text-primary hover:underline">
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RecuperarSenha
