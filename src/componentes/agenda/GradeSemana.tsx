// Visualização SEMANA: 7 dias × profissional (linhas).
// Cards compactos. Clicar no dia leva à visualização Dia daquela data.
// Renderiza opcionalmente bloqueios como pequenos chips cinzas com cadeado.
import { useMemo } from 'react'
import type { AgendamentoDetalhado, BloqueioAgenda } from '@/hooks/useAgenda'
import type { Profissional } from '@/hooks/useProfissionais'
import { CardAgendamento } from './CardAgendamento'
import { Lock } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  inicioSemana: Date
  profissionais: Profissional[]
  agendamentos: AgendamentoDetalhado[]
  onSelecionarDia: (d: Date) => void
  onAbrirAgendamento: (a: AgendamentoDetalhado) => void
  /** Bloqueios opcionais (renderizados como chips cinzas). */
  bloqueios?: BloqueioAgenda[]
}

const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit' })

const ROTULOS_TIPO: Record<string, string> = {
  pessoal: 'Pessoal',
  almoco: 'Almoço',
  folga: 'Folga',
  atestado: 'Atestado',
  feriado: 'Feriado',
}

const fmtHora = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function GradeSemana({
  inicioSemana,
  profissionais,
  agendamentos,
  onSelecionarDia,
  onAbrirAgendamento,
  bloqueios = [],
}: Props) {
  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana)
      d.setDate(d.getDate() + i)
      d.setHours(0, 0, 0, 0)
      return d
    })
  }, [inicioSemana])

  // Indexa por profissional + dia (yyyy-mm-dd)
  const indice = useMemo(() => {
    const mapa = new Map<string, AgendamentoDetalhado[]>()
    for (const a of agendamentos) {
      const d = new Date(a.data_hora_inicio)
      const chave = `${a.profissional_id}|${d.toISOString().slice(0, 10)}`
      const arr = mapa.get(chave) ?? []
      arr.push(a)
      mapa.set(chave, arr)
    }
    return mapa
  }, [agendamentos])

  // Indexa bloqueios por profissional + dia
  const indiceBloq = useMemo(() => {
    const mapa = new Map<string, BloqueioAgenda[]>()
    for (const b of bloqueios) {
      // Bloqueio pode atravessar dias — adiciona em cada dia que intersecta
      const ini = new Date(b.inicio)
      const fim = new Date(b.fim)
      const cursor = new Date(ini)
      cursor.setHours(0, 0, 0, 0)
      while (cursor < fim) {
        const chave = `${b.profissional_id}|${cursor.toISOString().slice(0, 10)}`
        const arr = mapa.get(chave) ?? []
        arr.push(b)
        mapa.set(chave, arr)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return mapa
  }, [bloqueios])

  if (profissionais.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Cadastre profissionais para ver a agenda.
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: `160px repeat(7, minmax(120px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 border-b bg-background" />
          {dias.map((d) => (
            <button
              key={d.toISOString()}
              onClick={() => onSelecionarDia(d)}
              className="border-b border-l bg-muted/40 px-2 py-2 text-center text-sm font-medium capitalize hover:bg-muted"
            >
              {fmtDia.format(d)}
            </button>
          ))}

          {profissionais.map((p) => (
            <div key={p.id} className="contents">
              <div className="sticky left-0 z-10 border-b bg-background px-2 py-2 text-sm font-medium">
                {p.nome}
              </div>
              {dias.map((d) => {
                const chave = `${p.id}|${d.toISOString().slice(0, 10)}`
                const itens = indice.get(chave) ?? []
                const bloqs = indiceBloq.get(chave) ?? []
                return (
                  <div key={chave} className="min-h-[80px] space-y-1 border-b border-l p-1">
                    {/* Chips de bloqueios */}
                    {bloqs.map((b) => (
                      <Tooltip key={b.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 rounded bg-muted/70 px-2 py-1 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="truncate">
                              {ROTULOS_TIPO[b.tipo] ?? b.tipo}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-medium">
                              {ROTULOS_TIPO[b.tipo] ?? b.tipo}
                            </div>
                            <div>
                              {fmtHora(b.inicio)} – {fmtHora(b.fim)}
                            </div>
                            {b.motivo && <div className="mt-1">{b.motivo}</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {itens.map((a) => (
                      <CardAgendamento
                        key={a.id}
                        agendamento={a}
                        compacto
                        onClick={() => onAbrirAgendamento(a)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
