'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/hooks/useTenant'
import { useFila } from '@/hooks/useFila'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FilaTVPage() {
  const { tenant, usuario, carregando: carregandoTenant } = useTenant()
  const { fila, carregando: carregandoFila } = useFila(tenant?.id, usuario?.unidadeId || undefined)
  const [somAtivado, setSomAtivado] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [ultimoChamadoId, setUltimoChamadoId] = useState<string | null>(null)

  // Som quando alguém é chamado
  useEffect(() => {
    const chamado = fila.find(item => item.status === 'chamado')
    if (chamado && chamado.id !== ultimoChamadoId && somAtivado) {
      const audio = new Audio('/notification.mp3') // Assumindo que existe um som
      audio.play().catch(e => console.log('Erro ao tocar som:', e))
      setUltimoChamadoId(chamado.id)
    }
  }, [fila, somAtivado, ultimoChamadoId])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  if (carregandoTenant || carregandoFila) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
        <p className="text-2xl animate-pulse">Carregando painel...</p>
      </div>
    )
  }

  if (tenant?.segmento !== 'barbearia') {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
        <p className="text-2xl">Módulo disponível apenas para Barbearias.</p>
      </div>
    )
  }

  const chamados = fila.filter(i => i.status === 'chamado')
  const aguardando = fila.filter(i => i.status === 'aguardando')

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans overflow-hidden select-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl font-bold">
            {tenant.nome.charAt(0)}
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{tenant.nome}</h1>
            <p className="text-zinc-400 text-xl">Painel de Atendimento</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setSomAtivado(!somAtivado)}
            className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            {somAtivado ? <Volume2 size={32} /> : <VolumeX size={32} />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            {isFullscreen ? <Minimize size={32} /> : <Maximize size={32} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
        {/* Lado Esquerdo: Chamado Agora */}
        <div className="col-span-8 flex flex-col gap-6">
          <h2 className="text-3xl font-semibold text-primary uppercase tracking-widest">Chamado Agora</h2>
          {chamados.length > 0 ? (
            <div className="flex-1 bg-zinc-900 border-2 border-primary/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center animate-pulse">
              <span className="text-zinc-400 text-2xl mb-4">POR FAVOR, DIRIJA-SE AO ATENDIMENTO</span>
              <h3 className="text-9xl font-black mb-6 uppercase">{chamados[0].clienteNome}</h3>
              <div className="flex gap-6 items-center">
                <Badge className="text-3xl px-8 py-4 bg-primary text-primary-foreground font-bold">
                  {chamados[0].profissionalNome || 'Qualquer Profissional'}
                </Badge>
                <span className="text-4xl text-zinc-300">|</span>
                <span className="text-4xl text-zinc-400 uppercase tracking-wider">{chamados[0].servicoNome || 'Serviço'}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center">
              <p className="text-3xl text-zinc-600 italic">Aguardando próximo cliente...</p>
            </div>
          )}
        </div>

        {/* Lado Direito: Próximos na Fila */}
        <div className="col-span-4 flex flex-col gap-6">
          <h2 className="text-3xl font-semibold text-zinc-400 uppercase tracking-widest text-right">Próximos</h2>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {aguardando.length > 0 ? (
              aguardando.slice(0, 5).map((item, index) => (
                <div 
                  key={item.id}
                  className="bg-zinc-900 rounded-2xl p-6 flex justify-between items-center border border-zinc-800"
                >
                  <div className="flex items-center gap-6">
                    <span className="text-5xl font-black text-primary/40">{index + 1}º</span>
                    <div>
                      <h4 className="text-3xl font-bold uppercase truncate max-w-[200px]">{item.clienteNome}</h4>
                      <p className="text-zinc-500 text-lg uppercase">{item.servicoNome || 'Serviço'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-400 text-sm">ESPERA</p>
                    <p className="text-2xl font-mono">
                      {formatDistanceToNow(new Date(item.entradaEm), { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-zinc-800 rounded-2xl">
                <p className="text-zinc-700">Fila vazia</p>
              </div>
            )}
            
            {aguardando.length > 5 && (
              <p className="text-center text-zinc-500 text-xl font-bold">
                + {aguardando.length - 5} pessoas aguardando
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé: Horário */}
      <div className="fixed bottom-8 left-8 right-8 flex justify-between items-end border-t border-zinc-800 pt-6">
        <p className="text-zinc-600 text-xl font-medium uppercase tracking-widest">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="text-7xl font-mono font-black text-zinc-300">
          <Clock />
        </div>
      </div>
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
}
