// Tela de cadastro do estabelecimento.
// Cria usuário no Supabase Auth e em seguida chama a Edge Function
// 'criar-tenant' para criar tenant + unidade + perfil + role 'admin'.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const SEGMENTOS = [
  { value: 'salao', label: 'Salão de Beleza' },
  { value: 'barbearia', label: 'Barbearia' },
  { value: 'estetica', label: 'Estética' },
  { value: 'tatuagem', label: 'Tatuagem' },
  { value: 'manicure', label: 'Manicure' },
] as const

const Cadastro = () => {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const segmentoInicial =
    (SEGMENTOS.find((s) => s.value === params.get('segmento'))?.value as string) ?? 'salao'

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('')
  const [segmento, setSegmento] = useState<string>(segmentoInicial)
  const [enviando, setEnviando] = useState(false)

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (senha.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (!nome.trim() || !nomeEstabelecimento.trim()) {
      toast.error('Preencha todos os campos.')
      return
    }
    setEnviando(true)
    try {
      // 1) Cria usuário no Auth (com auto-confirm o login já vem ativo)
      const { error: errSignUp } = await supabase.auth.signUp({
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
            : errSignUp.message,
        )
        return
      }

      // 2) Garante sessão para chamar a edge function autenticada
      const { data: sessao } = await supabase.auth.getSession()
      if (!sessao.session) {
        // Confirmação de email ainda ativa — orienta o usuário
        toast.success('Cadastro criado! Verifique seu e-mail para ativar a conta.')
        navegar('/login')
        return
      }

      // 3) Chama edge function para criar tenant + unidade + role
      const { error: errFn } = await supabase.functions.invoke('criar-tenant', {
        body: { nomeEstabelecimento, segmento, nomeAdmin: nome },
      })
      if (errFn) {
        toast.error('Conta criada, mas falhou ao configurar o estabelecimento.')
        return
      }

      toast.success('Bem-vindo ao HubBeleza!')
      navegar('/onboarding')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta grátis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submeter} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome completo</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Senha (mín. 8 caracteres)</label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome do estabelecimento</label>
              <Input
                value={nomeEstabelecimento}
                onChange={(e) => setNomeEstabelecimento(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Segmento</label>
              <select
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SEGMENTOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Criando…' : 'Criar conta'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Já tem conta? <Link to="/login" className="text-primary underline">Entrar</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Cadastro
