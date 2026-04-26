import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Mail, Shield, Trash2, Loader2, Users, Settings2, Check } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { CATALOGO_PERMISSOES } from '@/tipos/permissao'

export default function PaginaEquipeSuperAdmin() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<'super_admin' | 'admin'>('super_admin')
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<string[]>([])
  const [isPermissoesDialogOpen, setIsPermissoesDialogOpen] = useState(false)
  const [membroSelecionado, setMembroSelecionado] = useState<any>(null)

  const { data: equipe, isLoading } = useQuery({
    queryKey: ['equipe-super-admin'],
    queryFn: async () => {
      // Buscamos usuários que tenham a role super_admin na tabela user_roles
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, user_roles(role)')
        .is('tenant_id', null) // Membros da equipe global StudioFlow geralmente não têm tenant_id
      
      if (error) throw error
      
      // Filtrar apenas quem tem role super_admin ou admin global
      return data.filter(u => 
        (u.user_roles as any)?.some((r: any) => r.role === 'super_admin')
      )
    },
  })

  const adicionarMutation = useMutation({
    mutationFn: async () => {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            full_name: nome,
            is_super_admin: true, // Metadata para triggers se houver
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Erro ao criar usuário')

      // 2. O trigger handle_new_user deve criar o registro em usuarios
      // Mas precisamos garantir a role super_admin na tabela user_roles
      // Nota: Em uma arquitetura real, isso seria feito via Edge Function administrativa
      // ou um trigger que reconhece o metadata.
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'super_admin'
        })
      
      if (roleError) {
        console.error('Erro ao atribuir role:', roleError)
        // Não lançamos erro aqui se o usuário já foi criado, mas avisamos
        toast.warning('Usuário criado, mas pode ser necessário atribuir permissões manualmente.')
      }

      return authData.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipe-super-admin'] })
      toast.success('Membro da equipe adicionado com sucesso!')
      setIsDialogOpen(false)
      limparCampos()
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar membro: ' + error.message)
    },
  })

  const limparCampos = () => {
    setNome('')
    setEmail('')
    setSenha('')
    setRole('super_admin')
  }

  const handleOpenPermissoes = async (membro: any) => {
    setMembroSelecionado(membro)
    setIsPermissoesDialogOpen(true)
    
    // Buscar permissões atuais do usuário
    const { data, error } = await supabase
      .from('permissoes_do_perfil')
      .select('codigo_permissao')
      .eq('perfil_id', membro.id) // Na estrutura atual, usamos o ID do usuário se não houver perfil_id
    
    if (data) {
      setPermissoesSelecionadas(data.map(p => p.codigo_permissao))
    } else {
      setPermissoesSelecionadas([])
    }
  }

  const salvarPermissoesMutation = useMutation({
    mutationFn: async () => {
      if (!membroSelecionado) return

      // Limpar permissões antigas
      await supabase
        .from('permissoes_do_perfil')
        .delete()
        .eq('perfil_id', membroSelecionado.id)

      // Inserir novas permissões
      if (permissoesSelecionadas.length > 0) {
        const insertData = permissoesSelecionadas.map(codigo => ({
          perfil_id: membroSelecionado.id,
          codigo_permissao: codigo
        }))
        
        const { error } = await supabase
          .from('permissoes_do_perfil')
          .insert(insertData)
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Permissões atualizadas com sucesso!')
      setIsPermissoesDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar permissões: ' + error.message)
    }
  })

  const togglePermissao = (codigo: string) => {
    setPermissoesSelecionadas(prev => 
      prev.includes(codigo) 
        ? prev.filter(c => c !== codigo) 
        : [...prev, codigo]
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Equipe StudioFlow</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Gerencie os administradores globais da plataforma</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
              <UserPlus className="h-4 w-4" />
              Novo Administrador
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Adicionar à Equipe Global</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input
                  placeholder="Nome do administrador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  placeholder="email@studioflow.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha Inicial</label>
                <Input
                  placeholder="Mínimo 6 caracteres"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Papel</label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectItem value="super_admin">Super Admin (Acesso Total)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => adicionarMutation.mutate()}
                disabled={adicionarMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {adicionarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Acesso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="border-b border-zinc-800">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-zinc-400">Nome</TableHead>
                <TableHead className="text-zinc-400">E-mail</TableHead>
                <TableHead className="text-zinc-400">Permissão</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-violet-500" />
                  </TableCell>
                </TableRow>
              ) : equipe?.map((membro) => (
                <TableRow key={membro.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <TableCell className="font-medium text-zinc-100">{membro.nome}</TableCell>
                  <TableCell className="text-zinc-400">{membro.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-violet-400" />
                      <span className="text-xs font-medium text-violet-300 uppercase tracking-wider">
                        Super Admin
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      Ativo
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-violet-400"
                      onClick={() => handleOpenPermissoes(membro)}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Permissões
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {equipe?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-zinc-500">
                    Nenhum membro da equipe administrativa encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Permissões */}
      <Dialog open={isPermissoesDialogOpen} onOpenChange={setIsPermissoesDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Permissões: {membroSelecionado?.nome}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATALOGO_PERMISSOES.map((perm) => (
                <div 
                  key={perm.codigo}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={() => togglePermissao(perm.codigo)}
                >
                  <Checkbox 
                    checked={permissoesSelecionadas.includes(perm.codigo)}
                    onCheckedChange={() => togglePermissao(perm.codigo)}
                    className="mt-1 border-zinc-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-zinc-200">
                      {perm.rotulo}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {perm.categoria}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-zinc-900 pt-4 border-t border-zinc-800">
            <Button 
              variant="outline" 
              onClick={() => setIsPermissoesDialogOpen(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => salvarPermissoesMutation.mutate()}
              disabled={salvarPermissoesMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {salvarPermissoesMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
