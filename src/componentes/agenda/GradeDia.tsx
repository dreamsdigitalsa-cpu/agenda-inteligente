// Visualização DIA: colunas por profissional, linhas a cada 30min (8h-20h).
// Scroll horizontal quando passa de 6 profissionais visíveis.
//
// Renderiza opcionalmente bloqueios de agenda (folga, almoço, atestado…)
// como faixas cinzas com ícone de cadeado e tooltip explicativo.
import { useMemo } from 'react'
import type { AgendamentoDetalhado, BloqueioAgenda } from '@/hooks/useAgenda'
import type { Profissional } from '@/hooks/useProfissionais'
import { CardAgendamento } from './CardAgendamento'
import { Lock } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  data: Date
  profissionais: Profissional[]
  agendamentos: AgendamentoDetalhado[]
  onAbrirAgendamento: (a: AgendamentoDetalhado) => void
  /** Bloqueios opcionais (renderizados como faixas cinzas). */
  bloqueios?: BloqueioAgenda[]
}

const HORA_INICIO = 8
const HORA_FIM = 20
const SLOT_MIN = 30

const ROTULOS_TIPO: Record<string, string> = {
  pessoal: 'Pessoal',
  almoco: 'Almoço',
  folga: 'Folga',
  atestado: 'Atestado',
  feriado: 'Feriado',
}

export function GradeDia({
  profissionais,
  agendamentos,
  onAbrirAgendamento,
  bloqueios = [],
}: Props) {
  // Gera os horários da coluna esquerda
  const horarios = useMemo(() => {
    const lista: string[] = []
    for (let h = HORA_INICIO; h < HORA_FIM; h++) {
      for (let m = 0; m < 60; m += SLOT_MIN) {
        lista.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return lista
  }, [])

  // Indexa agendamentos por profissional
  const porProf = useMemo(() => {
    const mapa = new Map<string, AgendamentoDetalhado[]>()
    for (const a of agendamentos) {
      const arr = mapa.get(a.profissional_id) ?? []
      arr.push(a)
      mapa.set(a.profissional_id, arr)
    }
    return mapa
  }, [agendamentos])

  // Indexa bloqueios por profissional
  const bloqPorProf = useMemo(() => {
    const mapa = new Map<string, BloqueioAgenda[]>()
    for (const b of bloqueios) {
      const arr = mapa.get(b.profissional_id) ?? []
      arr.push(b)
      mapa.set(b.profissional_id, arr)
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

  // Largura mínima por coluna; >6 ativa scroll horizontal
  const colMin = profissionais.length > 6 ? 'min-w-[180px]' : 'min-w-0'

  // Verifica se um slot HH:MM está dentro de algum bloqueio do profissional
  const bloqueioNoSlot = (profId: string, hhmm: string) => {
    const lista = bloqPorProf.get(profId)
    if (!lista || lista.length === 0) return undefined
    const [h, m] = hhmm.split(':').map(Number)
    return lista.find((b) => {
      const inicio = new Date(b.inicio)
      const fim = new Date(b.fim)
      const slot = new Date(inicio)
      slot.setHours(h, m, 0, 0)
      return slot >= inicio && slot < fim
    })
  }

  // Verifica se este é o primeiro slot do bloqueio (pra renderizar a etiqueta uma vez)
  const ehInicioDoBloqueio = (b: BloqueioAgenda, hhmm: string) => {
    const ini = new Date(b.inicio)
    const ihhmm = `${String(ini.getHours()).padStart(2, '0')}:${String(ini.getMinutes()).padStart(2, '0')}`
    // Se o bloqueio começa antes de HORA_INICIO, considera o primeiro slot da grade.
    if (ini.getHours() < HORA_INICIO) return hhmm === `${String(HORA_INICIO).padStart(2, '0')}:00`
    // Arredonda para o slot de 30min anterior
    const minRounded = Math.floor(ini.getMinutes() / SLOT_MIN) * SLOT_MIN
    const slotHHMM = `${String(ini.getHours()).padStart(2, '0')}:${String(minRounded).padStart(2, '0')}`
    return hhmm === slotHHMM || hhmm === ihhmm
  }

  const fmtHora = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `80px repeat(${profissionais.length}, minmax(${profissionais.length > 6 ? 180 : 140}px, 1fr))`,
          }}
        >
          {/* Cabeçalho de colunas */}
          <div className="sticky left-0 z-10 border-b bg-background" />
          {profissionais.map((p) => (
            <div
              key={p.id}
              className={`border-b border-l bg-muted/40 px-2 py-2 text-center text-sm font-medium ${colMin}`}
            >
              {p.nome}
            </div>
          ))}

          {/* Linhas de horário */}
          {horarios.map((h) => (
            <div key={h} className="contents">
              <div className="sticky left-0 z-10 border-b bg-background px-2 py-2 text-right text-xs text-muted-foreground">
                {h}
              </div>
              {profissionais.map((p) => {
                // Verifica bloqueio nesta célula
                const bloq = bloqueioNoSlot(p.id, h)

                // Agendamentos que começam neste slot (HH:MM exato — simplificação)
                const itens = (porProf.get(p.id) ?? []).filter((a) => {
                  const d = new Date(a.data_hora_inicio)
                  return (
                    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` ===
                    h
                  )
                })

                return (
                  <div
                    key={p.id + h}
                    className={`relative min-h-[48px] border-b border-l p-1 ${
                      bloq ? 'cursor-not-allowed bg-muted/60' : ''
                    }`}
                  >
                    {/* Faixa de bloqueio com cadeado e tooltip */}
                    {bloq && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute inset-0 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            {ehInicioDoBloqueio(bloq, h) && (
                              <span className="font-medium">
                                {ROTULOS_TIPO[bloq.tipo] ?? bloq.tipo}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-medium">
                              {ROTULOS_TIPO[bloq.tipo] ?? bloq.tipo}
                            </div>
                            <div>
                              {fmtHora(bloq.inicio)} – {fmtHora(bloq.fim)}
                            </div>
                            {bloq.motivo && <div className="mt-1">{bloq.motivo}</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {/* Agendamentos por cima (caso existam mesmo com bloqueio) */}
                    {itens.map((a) => (
                      <CardAgendamento
                        key={a.id}
                        agendamento={a}
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
