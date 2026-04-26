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
import { toast } from 'sonner'
import { UserPlus, Mail, Shield, Trash2, Copy, Check } from 'lucide-react'
import { useTenant } from '@/hooks/useTenant'

export function AbaUsuarios() {
  const { tenant } = useTenant()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'profissional' | 'recepcionista'>('profissional')
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

  const convidarMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error('Tenant não encontrado')
      
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites'] })
      toast.success('Convite enviado com sucesso!')
      setIsDialogOpen(false)
      setEmail('')
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar convite: ' + error.message)
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
              Convidar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar novo usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
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
                onClick={() => convidarMutation.mutate()}
                disabled={convidarMutation.isPending}
              >
                Enviar convite
              </Button>
            </div>
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
