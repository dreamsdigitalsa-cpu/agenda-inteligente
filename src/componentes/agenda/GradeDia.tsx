// Visualização DIA: colunas por profissional, linhas a cada 30min (8h-20h).
// Scroll horizontal quando passa de 6 profissionais visíveis.
import { useMemo } from 'react'
import type { AgendamentoDetalhado } from '@/hooks/useAgenda'
import type { Profissional } from '@/hooks/useProfissionais'
import { CardAgendamento } from './CardAgendamento'

interface Props {
  data: Date
  profissionais: Profissional[]
  agendamentos: AgendamentoDetalhado[]
  onAbrirAgendamento: (a: AgendamentoDetalhado) => void
}

const HORA_INICIO = 8
const HORA_FIM = 20
const SLOT_MIN = 30

export function GradeDia({ profissionais, agendamentos, onAbrirAgendamento }: Props) {
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

  if (profissionais.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Cadastre profissionais para ver a agenda.
      </div>
    )
  }

  // Largura mínima por coluna; >6 ativa scroll horizontal
  const colMin = profissionais.length > 6 ? 'min-w-[180px]' : 'min-w-0'

  return (
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
              // Agendamentos que começam neste slot (HH:MM exato — simplificação)
              const itens = (porProf.get(p.id) ?? []).filter((a) => {
                const d = new Date(a.data_hora_inicio)
                return (
                  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` ===
                  h
                )
              })
              return (
                <div key={p.id + h} className="min-h-[48px] border-b border-l p-1">
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
  )
}
