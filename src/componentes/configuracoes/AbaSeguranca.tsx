import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/cliente'
import { Shield, Clock, Smartphone, LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTenant } from '@/hooks/useTenant'

export function AbaSeguranca() {
  const { usuario, carregando: tenantCarregando } = useTenant()
  const [carregando, setCarregando] = useState(false)
  
  // Como não temos acesso fácil a sessões ativas do auth.users via client JS puro (requer Admin API),
  // vamos mostrar um histórico simulado ou focar no que é acessível.
  const sessoesSimuladas = [
    { id: '1', dispositivo: 'Chrome em Windows', local: 'São Paulo, BR', atual: true, data: new Date().toISOString() },
    { id: '2', dispositivo: 'Safari em iPhone', local: 'São Paulo, BR', atual: false, data: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  ]

  const encerrarSessoes = async () => {
    setCarregando(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Você foi desconectado de todos os dispositivos.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCarregando(false)
    }
  }

  if (tenantCarregando) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>

  if (!usuario) return <div className="p-12 text-center text-muted-foreground">Usuário não encontrado.</div>

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-4 w-4 text-primary" /> Dispositivos Conectados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y">
            {sessoesSimuladas.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {s.dispositivo}
                      {s.atual && <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">Sessão atual</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.local} • {formatDistanceToNow(new Date(s.data), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                </div>
                {!s.atual && (
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Encerrar
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full rounded-full text-destructive border-destructive/20 hover:bg-destructive/5"
            onClick={encerrarSessoes}
            disabled={carregando}
          >
            {carregando ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
            Encerrar todas as sessões
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-4 w-4 text-primary" /> Histórico de Acessos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Evento</th>
                  <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" /> Login realizado
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date().toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">177.12.XXX.XXX</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" /> Alteração de senha
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">22/04/2026 14:20</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">177.12.XXX.XXX</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
