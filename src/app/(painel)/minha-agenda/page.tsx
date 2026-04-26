// Painel do Profissional — Minha Agenda
//
// Página que mostra apenas a agenda do profissional logado, incluindo:
// - Agendamentos próprios (filtrados via useAgenda + profissionalId)
// - Bloqueios próprios (folga, almoço, atestado…)
// - Botões para criar agendamento e bloquear horário
// RLS já garante que ele só consegue ver o próprio tenant; o filtro
// por profissional_id evita ruído visual de outros profissionais.
import { useMemo, useState } from 'react'
import { useProfissional } from '@/hooks/useProfissional'
import { useAgenda, type AgendamentoDetalhado } from '@/hooks/useAgenda'
import {
  GradeDia,
  GradeSemana,
  ModalNovoAgendamento,
  ModalBloquearHorario,
  DrawerDetalhesAgendamento,
} from '@/componentes/agenda'
import { Button } from '@/components/ui/button'
import { Lock, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

type Visao = 'dia' | 'semana'

// Calcula o intervalo [inicio, fim) conforme a visão escolhida.
function calcularIntervalo(data: Date, visao: Visao) {
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  if (visao === 'dia') {
    fim.setDate(fim.getDate() + 1)
  } else {
    // Semana: domingo (0) a sábado — alinhada ao GradeSemana
    inicio.setDate(data.getDate() - data.getDay())
    inicio.setHours(0, 0, 0, 0)
    fim.setTime(inicio.getTime())
    fim.setDate(inicio.getDate() + 7)
  }
  return { inicio, fim }
}

const formatador = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export default function MinhaAgenda() {
  const { profissional, carregando: profCarregando } = useProfissional()
  const [data, setData] = useState(new Date())
  const [visao, setVisao] = useState<Visao>('dia')
  const [modalNovo, setModalNovo] = useState(false)
  const [modalBloqueio, setModalBloqueio] = useState(false)
  const [detalhe, setDetalhe] = useState<AgendamentoDetalhado | null>(null)

  // Calcula intervalo conforme a visão
  const { inicio, fim } = useMemo(() => calcularIntervalo(data, visao), [data, visao])

  // Hook filtrado pelo profissional logado e com bloqueios
  const { agendamentos, bloqueios, atualizadoAgora, recarregar } = useAgenda(inicio, fim, {
    profissionalId: profissional?.id,
    incluirBloqueios: true,
  })

  if (profCarregando) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profissional) {
    return (
      <div className="m-4 rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
        Você não está vinculado a um perfil de profissional.
        <br />
        Contate o administrador.
      </div>
    )
  }

  // Lista virtual com apenas o profissional logado (para reusar grids)
  const listaProf = [
    {
      id: profissional.id,
      nome: profissional.nome,
      especialidade: profissional.especialidade,
      ativo: true,
    },
  ]

  const ir = (dias: number) => {
    const d = new Date(data)
    d.setDate(d.getDate() + dias)
    setData(d)
  }

  return (
    <div className="space-y-4 p-4">
      {/* Cabeçalho com saudação e botões de ação */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minha agenda</h1>
          <p className="text-sm text-muted-foreground">
            {profissional.nome} · {profissional.especialidade ?? 'Profissional'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setModalBloqueio(true)}>
            <Lock className="mr-2 h-4 w-4" />
            Bloquear horário
          </Button>
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo agendamento
          </Button>
        </div>
      </div>

      {/* Navegação de data + toggle visão */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => ir(visao === 'dia' ? -1 : -7)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setData(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => ir(visao === 'dia' ? 1 : 7)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium capitalize text-foreground">
            {formatador.format(data)}
          </span>
          {atualizadoAgora && (
            <span className="ml-2 animate-in fade-in text-xs text-muted-foreground">
              • Agenda atualizada agora
            </span>
          )}
        </div>

        <div className="inline-flex rounded-md border bg-muted p-0.5">
          <button
            onClick={() => setVisao('dia')}
            className={`rounded px-3 py-1 text-sm transition ${
              visao === 'dia' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setVisao('semana')}
            className={`rounded px-3 py-1 text-sm transition ${
              visao === 'semana' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Grade com os bloqueios renderizados como faixas cinzas */}
      {visao === 'dia' ? (
        <GradeDia
          data={data}
          profissionais={listaProf}
          agendamentos={agendamentos}
          bloqueios={bloqueios}
          onAbrirAgendamento={setDetalhe}
        />
      ) : (
        <GradeSemana
          inicioSemana={inicio}
          profissionais={listaProf}
          agendamentos={agendamentos}
          bloqueios={bloqueios}
          onSelecionarDia={(d) => {
            setData(d)
            setVisao('dia')
          }}
          onAbrirAgendamento={setDetalhe}
        />
      )}

      {/* Modais */}
      <ModalNovoAgendamento
        aberto={modalNovo}
        onFechar={() => setModalNovo(false)}
        onCriado={() => recarregar()}
        dataInicial={data}
        profissionalIdPreSelecionado={profissional.id}
      />
      <ModalBloquearHorario
        aberto={modalBloqueio}
        aoFechar={() => setModalBloqueio(false)}
        profissionalId={profissional.id}
        aoSalvar={() => recarregar()}
      />

      <DrawerDetalhesAgendamento agendamento={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  )
}
