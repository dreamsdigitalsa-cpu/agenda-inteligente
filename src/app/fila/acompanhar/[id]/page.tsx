'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/cliente'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Clock, MapPin, AlertCircle, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PaginaAcompanharFila() {
  const { id } = useParams()
  const { toast } = useToast()
  
  const [registro, setRegistro] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoPendente, setAcaoPendente] = useState(false)

  useEffect(() => {
    if (!id) return
    
    async function carregar() {
      const { data } = await supabase
        .from('fila_espera')
        .select('*, tenants(nome)')
        .eq('id', id)
        .single()
      
      if (data) setRegistro(data)
      setCarregando(false)
    }
    
    carregar()
    
    const canal = supabase
      .channel(`acompanhar_fila_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_espera', filter: `id=eq.${id}` }, carregar)
      .subscribe()
      
    return () => { supabase.removeChannel(canal) }
  }, [id])

  async function sairDaFila() {
    if (!window.confirm('Tem certeza que deseja sair da fila?')) return
    setAcaoPendente(true)
    try {
      const { error } = await supabase
        .from('fila_espera')
        .update({ status: 'cancelado' })
        .eq('id', id)
      
      if (error) throw error
      toast({ title: 'Cancelado', description: 'Você saiu da fila com sucesso.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setAcaoPendente(false)
    }
  }

  async function avisarAtraso() {
    setAcaoPendente(true)
    try {
      const { error } = await supabase
        .from('fila_espera')
        .update({ atraso_minutos: (registro?.atraso_minutos || 0) + 5 })
        .eq('id', id)
      
      if (error) throw error
      toast({ title: 'Aviso enviado!', description: 'O estabelecimento foi informado do seu atraso.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setAcaoPendente(false)
    }
  }

  if (carregando) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  if (!registro) return <div className="p-8 text-center">Registro não encontrado.</div>

  if (registro.status === 'atendido') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Chegou a sua vez!</h1>
        <p className="text-muted-foreground">O profissional já está te aguardando. Dirija-se ao atendimento.</p>
      </div>
    )
  }

  if (registro.status === 'cancelado') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center space-y-4">
        <XCircle className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Você saiu da fila</h1>
        <p className="text-muted-foreground text-sm">Este registro não é mais válido.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-xl font-bold">{registro.tenants?.nome}</h1>
          <p className="text-muted-foreground text-sm">Acompanhamento em tempo real</p>
        </header>

        <Card className="rounded-3xl border-none shadow-elegant bg-gradient-primary text-white">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-6xl font-black">{registro.posicao === 0 ? 'PRÓXIMO' : registro.posicao + 'º'}</CardTitle>
            <p className="text-sm font-medium opacity-80 uppercase tracking-widest">Sua posição atual</p>
          </CardHeader>
          <CardContent className="text-center">
            {registro.posicao === 1 ? (
              <p className="text-sm font-bold bg-white/20 rounded-full px-4 py-2 inline-block">
                Prepare-se, você é o próximo!
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm opacity-90">
                <Clock className="h-4 w-4" />
                <span>Espera estimada: ~{registro.posicao * 15} min</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl h-14 font-semibold border-none shadow-sm"
            onClick={avisarAtraso}
            disabled={acaoPendente}
          >
            <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
            Atraso 5 min
          </Button>
          <Button 
            variant="outline" 
            className="rounded-2xl h-14 font-semibold border-none shadow-sm text-destructive"
            onClick={sairDaFila}
            disabled={acaoPendente}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Sair da fila
          </Button>
        </div>

        <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
        <p className="text-center text-xs text-muted-foreground px-8 leading-relaxed">
          Mantenha esta página aberta para acompanhar sua posição. Enviaremos um WhatsApp quando estiver próximo de ser chamado.
        </p>
      </div>
    </div>
  )
}
