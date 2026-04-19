// Visualização SEMANA: 7 dias × profissional (linhas).
// Cards compactos. Clicar no dia leva à visualização Dia daquela data.
import { useMemo } from 'react'
import type { AgendamentoDetalhado } from '@/hooks/useAgenda'
import type { Profissional } from '@/hooks/useProfissionais'
import { CardAgendamento } from './CardAgendamento'

interface Props {
  inicioSemana: Date
  profissionais: Profissional[]
  agendamentos: AgendamentoDetalhado[]
  onSelecionarDia: (d: Date) => void
  onAbrirAgendamento: (a: AgendamentoDetalhado) => void
}

const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit' })

export function GradeSemana({
  inicioSemana,
  profissionais,
  agendamentos,
  onSelecionarDia,
  onAbrirAgendamento,
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

  if (profissionais.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Cadastre profissionais para ver a agenda.
      </div>
    )
  }

  return (
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
              return (
                <div key={chave} className="min-h-[80px] space-y-1 border-b border-l p-1">
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
  )
}
