import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { Loader2, Save, User as UserIcon, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function AbaMeuPerfil() {
  const { usuario } = useTenant()
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    telefone: '', // TODO: buscar do banco se houver
    especialidades: ''
  })

  const handleSalvar = async () => {
    if (!usuario?.id) return
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: form.nome,
          // telefone: form.telefone,
          // especialidades: form.especialidades
        })
        .eq('id', usuario.id)

      if (error) throw error
      toast.success('Perfil atualizado!')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar perfil.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="h-4 w-4 text-primary" /> Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {usuario?.nome?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <Button variant="outline" size="sm" className="rounded-full">
                Alterar foto
              </Button>
              <p className="text-xs text-muted-foreground">JPG ou PNG de até 2MB.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input 
                value={form.nome} 
                onChange={e => setForm({...form, nome: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail (Read-only)</Label>
              <Input value={usuario?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={form.telefone} 
                onChange={e => setForm({...form, telefone: e.target.value})} 
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <Input 
                value={form.especialidades} 
                onChange={e => setForm({...form, especialidades: e.target.value})} 
                placeholder="Ex: Corte, Barba, Coloração"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSalvar} 
              disabled={salvando}
              className="rounded-full bg-gradient-primary shadow-elegant px-8"
            >
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <Lock className="h-4 w-4" /> Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Recomendamos usar uma senha forte que você não use em outros sites.
          </p>
          <Button variant="outline" className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/5">
            Alterar senha de acesso
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
