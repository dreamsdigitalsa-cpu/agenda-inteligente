// Painel: agenda principal (Dia/Semana) com Realtime.
// - Cabeçalho com navegação de data, toggle, filtro multi-select e novo agendamento.
// - Realtime via useAgenda (sem cache).
// - Drawer de detalhes ao clicar no card.
import { useMemo, useState } from 'react'
import {
  CabecalhoAgenda,
  GradeDia,
  GradeSemana,
  ModalNovoAgendamento,
  DrawerDetalhesAgendamento,
} from '@/componentes/agenda'
import { useAgenda, type AgendamentoDetalhado } from '@/hooks/useAgenda'
import { useProfissionais } from '@/hooks/useProfissionais'
import { useTenant } from '@/hooks/useTenant'
import { Loader2 } from 'lucide-react'
import type { ModoAgenda } from '@/componentes/agenda/CabecalhoAgenda'

// Calcula início da semana (segunda-feira) a partir de uma data
function inicioDaSemana(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const dia = r.getDay() // 0=dom
  const diff = dia === 0 ? -6 : 1 - dia
  r.setDate(r.getDate() + diff)
  return r
}

const PaginaAgenda = () => {
  const { tenant, carregando: tenantCarregando } = useTenant()
  const [data, setData] = useState<Date>(() => new Date())
  const [modo, setModo] = useState<ModoAgenda>('dia')
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [modalNovo, setModalNovo] = useState(false)
  const [detalhe, setDetalhe] = useState<AgendamentoDetalhado | null>(null)

  const { profissionais } = useProfissionais()

  // Define intervalo conforme o modo escolhido
  const [inicio, fim] = useMemo(() => {
    if (modo === 'dia') {
      const ini = new Date(data); ini.setHours(0, 0, 0, 0)
      const f = new Date(ini); f.setDate(f.getDate() + 1)
      return [ini, f]
    }
    const ini = inicioDaSemana(data)
    const f = new Date(ini); f.setDate(f.getDate() + 7)
    return [ini, f]
  }, [data, modo])

  const { agendamentos, atualizadoAgora } = useAgenda(inicio, fim)

  // Aplica filtro de profissionais (se nenhum selecionado, mostra todos)
  const profsVisiveis = useMemo(
    () => (selecionados.length ? profissionais.filter((p) => selecionados.includes(p.id)) : profissionais),
    [profissionais, selecionados],
  )
  const agsFiltrados = useMemo(
    () => (selecionados.length ? agendamentos.filter((a) => selecionados.includes(a.profissional_id)) : agendamentos),
    [agendamentos, selecionados],
  )

  const toggleProf = (id: string) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  if (tenantCarregando) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <CabecalhoAgenda
        data={data}
        modo={modo}
        profissionais={profissionais}
        selecionados={selecionados}
        onMudarData={setData}
        onMudarModo={setModo}
        onTogglProfissional={toggleProf}
        onNovo={() => setModalNovo(true)}
        atualizadoAgora={atualizadoAgora}
      />

      {modo === 'dia' ? (
        <GradeDia
          data={data}
          profissionais={profsVisiveis}
          agendamentos={agsFiltrados}
          onAbrirAgendamento={setDetalhe}
        />
      ) : (
        <GradeSemana
          inicioSemana={inicio}
          profissionais={profsVisiveis}
          agendamentos={agsFiltrados}
          onSelecionarDia={(d) => {
            setData(d)
            setModo('dia')
          }}
          onAbrirAgendamento={setDetalhe}
        />
      )}

      <ModalNovoAgendamento
        aberto={modalNovo}
        onFechar={() => setModalNovo(false)}
        onCriado={() => { /* realtime já recarrega */ }}
        dataInicial={data}
      />

      <DrawerDetalhesAgendamento agendamento={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  )
}

export default PaginaAgenda
