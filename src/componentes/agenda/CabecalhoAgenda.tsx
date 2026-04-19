// Cabeçalho da agenda: navegação de data, toggle dia/semana,
// filtro multi-select de profissionais e botão "Novo agendamento".
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import type { Profissional } from '@/hooks/useProfissionais'

export type ModoAgenda = 'dia' | 'semana'

interface Props {
  data: Date
  modo: ModoAgenda
  profissionais: Profissional[]
  selecionados: string[]
  onMudarData: (d: Date) => void
  onMudarModo: (m: ModoAgenda) => void
  onTogglProfissional: (id: string) => void
  onNovo: () => void
  atualizadoAgora?: boolean
}

const formatador = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function CabecalhoAgenda({
  data,
  modo,
  profissionais,
  selecionados,
  onMudarData,
  onMudarModo,
  onTogglProfissional,
  onNovo,
  atualizadoAgora,
}: Props) {
  const ir = (dias: number) => {
    const d = new Date(data)
    d.setDate(d.getDate() + dias)
    onMudarData(d)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => ir(modo === 'dia' ? -1 : -7)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => onMudarData(new Date())}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={() => ir(modo === 'dia' ? 1 : 7)}>
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

      <div className="flex items-center gap-2">
        {/* Toggle Dia | Semana */}
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          <button
            onClick={() => onMudarModo('dia')}
            className={`rounded px-3 py-1 text-sm transition ${
              modo === 'dia' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => onMudarModo('semana')}
            className={`rounded px-3 py-1 text-sm transition ${
              modo === 'semana' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Semana
          </button>
        </div>

        {/* Filtro multi-select de profissionais */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Profissionais ({selecionados.length || 'todos'})
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-2">
              {profissionais.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selecionados.includes(p.id)}
                    onCheckedChange={() => onTogglProfissional(p.id)}
                  />
                  {p.nome}
                </label>
              ))}
              {profissionais.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum profissional cadastrado.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={onNovo}>
          <Plus className="mr-2 h-4 w-4" />
          Novo agendamento
        </Button>
      </div>
    </div>
  )
}
