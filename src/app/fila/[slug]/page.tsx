'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PaginaFilaPublica() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [tenant, setTenant] = useState<any>(null)
  const [fila, setFila] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  
  const [form, setForm] = useState({ nome: '', telefone: '' })

  useEffect(() => {
    if (!slug) return
    
    async function carregar() {
      const { data: t } = await supabase
        .from('tenants')
        .select('id, nome, slug')
        .eq('slug', slug)
        .single()
      
      if (t) {
        setTenant(t)
        const { data: f } = await supabase
          .from('fila_espera')
          .select('*')
          .eq('tenant_id', t.id)
          .eq('status', 'aguardando')
          .order('posicao', { ascending: true })
        
        setFila(f || [])
      }
      setCarregando(false)
    }
    
    carregar()
    
    const canal = supabase
      .channel('fila_publica')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_espera' }, carregar)
      .subscribe()
      
    return () => { supabase.removeChannel(canal) }
  }, [slug])

  async function entrarNaFila() {
    if (!form.nome || !form.telefone) return
    setEnviando(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('entrar-na-fila', {
        body: { slug, ...form }
      })
      
      if (error) throw error
      
      toast({ title: 'Sucesso!', description: 'Você entrou na fila de espera.' })
      navigate(`/fila/acompanhar/${data.id}`)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  if (!tenant) return <div className="p-8 text-center">Estabelecimento não encontrado.</div>

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold">{tenant.nome}</h1>
          <p className="text-muted-foreground">Fila de espera em tempo real</p>
        </header>

        <Card className="rounded-3xl border-none shadow-elegant">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-4xl font-black text-primary">{fila.length}</CardTitle>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pessoas na fila</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                <span>~{fila.length * 15} min de espera</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-card">
          <CardHeader>
            <CardTitle>Entrar na fila</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                placeholder="Seu nome" 
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="rounded-xl"
              />
              <Input 
                placeholder="Seu WhatsApp (com DDD)" 
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <Button 
              className="w-full rounded-full bg-gradient-primary font-bold h-12"
              onClick={entrarNaFila}
              disabled={enviando || !form.nome || !form.telefone}
            >
              {enviando ? <Loader2 className="animate-spin mr-2" /> : 'Entrar na fila agora'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-2">Próximos da fila</h3>
          {fila.slice(0, 5).map((item, idx) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {idx + 1}º
                </div>
                <span className="font-medium">{item.cliente_nome.split(' ')[0]}***</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Aguardando</span>
            </div>
          ))}
          {fila.length > 5 && (
            <p className="text-center text-xs text-muted-foreground font-medium italic">
              + {fila.length - 5} pessoas aguardando
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
