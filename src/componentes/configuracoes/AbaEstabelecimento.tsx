import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { Loader2, Save, Upload, Sparkles } from 'lucide-react'

const DIAS = [
  { id: 'seg', nome: 'Segunda' },
  { id: 'ter', nome: 'Terça' },
  { id: 'qua', nome: 'Quarta' },
  { id: 'qui', nome: 'Quinta' },
  { id: 'sex', nome: 'Sexta' },
  { id: 'sab', nome: 'Sábado' },
  { id: 'dom', nome: 'Domingo' },
] as const

export function AbaEstabelecimento() {
  const { tenant, carregando: tenantCarregando } = useTenant()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [config, setConfig] = useState<any>(null)
  
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    corPrincipal: '#7c3aed',
    slugPublico: '',
    horarios: Object.fromEntries(DIAS.map((d) => [d.id, { ativo: false, abertura: '09:00', fechamento: '18:00' }]))
  })

  useEffect(() => {
    async function carregar() {
      if (!tenant?.id) {
        if (!tenantCarregando) setCarregando(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('configuracoes_tenant')
          .select('*')
          .eq('tenant_id', tenant.id)
          .maybeSingle()

        if (error) throw error
        
        if (data) {
          setConfig(data)
          setForm({
            nome: tenant.nome || '',
            cnpj: data.cnpj || '',
            telefone: data.telefone || '',
            endereco: data.endereco || '',
            corPrincipal: data.cor_principal || '#7c3aed',
            slugPublico: data.slug_publico || '',
            horarios: (data.horario_funcionamento as any) || form.horarios
          })
        } else {
          setForm(f => ({ ...f, nome: tenant.nome || '', slugPublico: '' }))
        }
      } catch (e: any) {
        console.error(e)
        toast.error('Erro ao carregar configurações.')
      } finally {
        setCarregando(false)
      }
    }
    if (!tenantCarregando) carregar()
  }, [tenant?.id, tenantCarregando])

  const handleSalvar = async () => {
    if (!tenant?.id) return
    setSalvando(true)
    try {
      // 1. Atualizar nome do tenant se mudou
      if (form.nome !== tenant.nome) {
        const { error: tErr } = await supabase
          .from('tenants')
          .update({ nome: form.nome })
          .eq('id', tenant.id)
        if (tErr) throw tErr
      }

      // 2. Atualizar ou inserir configurações
      const { error: cErr } = await supabase
        .from('configuracoes_tenant')
        .upsert({
          tenant_id: tenant.id,
          cnpj: form.cnpj,
          telefone: form.telefone,
          endereco: form.endereco,
          cor_principal: form.corPrincipal,
          slug_publico: form.slugPublico,
          horario_funcionamento: form.horarios as any,
          atualizado_em: new Date().toISOString()
        }, { onConflict: 'tenant_id' })

      if (cErr) throw cErr
      
      toast.success('Configurações do estabelecimento salvas!')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configurações.')
    } finally {
      setSalvando(false)
    }
  }

  if (tenantCarregando || carregando) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
  
  if (!tenant) return <div className="p-12 text-center text-muted-foreground">Você precisa estar vinculado a um estabelecimento.</div>

  return (
    <Card className="rounded-2xl border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" /> Dados do Estabelecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome do Estabelecimento</Label>
            <Input 
              value={form.nome} 
              onChange={e => setForm({...form, nome: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Segmento (Read-only)</Label>
            <Input value={tenant?.segmento || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ (Opcional)</Label>
            <Input 
              value={form.cnpj} 
              onChange={e => setForm({...form, cnpj: e.target.value})} 
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input 
              value={form.telefone} 
              onChange={e => setForm({...form, telefone: e.target.value})} 
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Endereço Completo</Label>
          <Input 
            value={form.endereco} 
            onChange={e => setForm({...form, endereco: e.target.value})} 
            placeholder="Rua, Número, Bairro, Cidade, UF"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Slug do Link Público (agendar/slug)</Label>
            <Input 
              value={form.slugPublico} 
              onChange={e => setForm({...form, slugPublico: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Cor Primária</Label>
            <div className="flex gap-2">
              <Input 
                type="color" 
                value={form.corPrincipal} 
                onChange={e => setForm({...form, corPrincipal: e.target.value})}
                className="w-12 p-1 h-10"
              />
              <Input 
                value={form.corPrincipal} 
                onChange={e => setForm({...form, corPrincipal: e.target.value})}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <Label className="text-base font-bold">Horário de Funcionamento</Label>
          <div className="space-y-2">
            {DIAS.map((d) => {
              const h = form.horarios[d.id]
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-md border bg-muted/20">
                  <Checkbox
                    id={`dia-${d.id}`}
                    checked={h.ativo}
                    onCheckedChange={(v) =>
                      setForm({
                        ...form,
                        horarios: { ...form.horarios, [d.id]: { ...h, ativo: !!v } }
                      })
                    }
                  />
                  <Label htmlFor={`dia-${d.id}`} className="w-24 cursor-pointer font-medium">
                    {d.nome}
                  </Label>
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="time"
                      value={h.abertura}
                      disabled={!h.ativo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          horarios: { ...form.horarios, [d.id]: { ...h, abertura: e.target.value } }
                        })
                      }
                      className="w-28"
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={h.fechamento}
                      disabled={!h.ativo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          horarios: { ...form.horarios, [d.id]: { ...h, fechamento: e.target.value } }
                        })
                      }
                      className="w-28"
                    />
                  </div>
                </div>
              )
            })}
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
  )
}
