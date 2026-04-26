import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { UserPlus, Mail, Shield, Trash2, Copy, Check, Loader2 } from 'lucide-react'
import { useTenant } from '@/hooks/useTenant'

export function AbaUsuarios() {
  const { tenant } = useTenant()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<'admin' | 'profissional' | 'recepcionista'>('profissional')
  const [metodo, setMetodo] = useState<'convite' | 'direto'>('direto')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const { data: convites, isLoading } = useQuery({
    queryKey: ['convites', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convites_usuario')
        .select('*')
        .order('criado_em', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id,
  })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-tenant', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, user_roles(role)')
        .eq('tenant_id', tenant?.id)
      
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id,
  })

  const adicionarMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error('Tenant não encontrado')
      
      if (metodo === 'convite') {
        const { data, error } = await supabase
          .from('convites_usuario')
          .insert({
            tenant_id: tenant.id,
            email,
            role,
            status: 'pendente',
          })
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Inclusão direta usando signUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              full_name: nome,
              tenant_id: tenant.id,
              role: role,
            }
          }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Erro ao criar usuário')

        // O trigger no banco deve criar o registro em usuarios e user_roles
        // mas como não temos certeza absoluta do trigger, podemos tentar forçar aqui
        // se o RLS permitir. Geralmente o trigger 'handle_new_user' faz isso.
        
        return authData.user
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites'] })
      queryClient.invalidateQueries({ queryKey: ['usuarios-tenant'] })
      toast.success(metodo === 'convite' ? 'Convite enviado!' : 'Usuário criado com sucesso!')
      setIsDialogOpen(false)
      setEmail('')
      setNome('')
      setSenha('')
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar: ' + (error.message || 'Erro desconhecido'))
    },
  })

  const cancelarConviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('convites_usuario')
        .update({ status: 'cancelado' })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites'] })
      toast.success('Convite cancelado')
    },
  })

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/aceitar-convite?token=${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success('Link de convite copiado!')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuários e Profissionais</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie quem tem acesso ao sistema do seu estabelecimento.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Novo Usuário/Profissional</DialogTitle>
            </DialogHeader>
            <Tabs value={metodo} onValueChange={(v: any) => setMetodo(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="direto">Inclusão Direta</TabsTrigger>
                <TabsTrigger value="convite">Enviar Convite</TabsTrigger>
              </TabsList>
              
              <div className="space-y-4 py-4">
                {metodo === 'direto' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo</label>
                    <Input
                      placeholder="Nome do profissional"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input
                    placeholder="email@exemplo.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {metodo === 'direto' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha Inicial</label>
                    <Input
                      placeholder="Mínimo 6 caracteres"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nível de acesso</label>
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => adicionarMutation.mutate()}
                  disabled={adicionarMutation.isPending}
                >
                  {adicionarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {metodo === 'convite' ? 'Enviar Convite' : 'Criar Usuário Agora'}
                </Button>
                
                {metodo === 'direto' && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    O usuário poderá acessar o sistema imediatamente com o e-mail e senha definidos.
                  </p>
                )}
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
        {/* Lista de Usuários Ativos */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Usuários Ativos</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">
                    {Array.isArray(user.user_roles) 
                      ? user.user_roles.map((r: any) => r.role).join(', ')
                      : 'Profissional'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Ativo
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!usuarios || usuarios.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Convites Pendentes */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Convites Pendentes</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convites?.filter(c => c.status === 'pendente').map((convite) => (
                <TableRow key={convite.id}>
                  <TableCell className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {convite.email}
                  </TableCell>
                  <TableCell className="capitalize">{convite.role}</TableCell>
                  <TableCell>
                    {new Date(convite.expira_em).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copiarLink(convite.token)}
                        title="Copiar link de convite"
                      >
                        {copiedToken === convite.token ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => cancelarConviteMutation.mutate(convite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {convites?.filter(c => c.status === 'pendente').length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum convite pendente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
