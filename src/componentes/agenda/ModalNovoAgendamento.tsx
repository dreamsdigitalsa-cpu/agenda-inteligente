// Modal para criar novo agendamento.
// - Busca cliente por nome/telefone (cria inline se não achar).
// - Seleciona profissional + serviço (carrega duração).
// - Data/hora + observações.
// - Verifica conflito de horário (mesmo profissional, intervalo sobreposto).
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { useProfissionais } from '@/hooks/useProfissionais'
import { useServicos } from '@/hooks/useServicos'
import { toast } from 'sonner'

interface Props {
  aberto: boolean
  onFechar: () => void
  onCriado: () => void
  dataInicial?: Date
  /** Pré-seleciona um profissional (usado no painel do profissional logado). */
  profissionalIdPreSelecionado?: string
}

interface ClienteBusca {
  id: string
  nome: string
  telefone: string
}

export function ModalNovoAgendamento({
  aberto,
  onFechar,
  onCriado,
  dataInicial,
  profissionalIdPreSelecionado,
}: Props) {
  const { tenant } = useTenant()
  const { profissionais } = useProfissionais()
  const { servicos } = useServicos()

  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ClienteBusca[]>([])
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [profId, setProfId] = useState(profissionalIdPreSelecionado ?? '')
  const [servId, setServId] = useState('')
  const [data, setData] = useState(() =>
    (dataInicial ?? new Date()).toISOString().slice(0, 10),
  )
  const [hora, setHora] = useState('09:00')
  const [obs, setObs] = useState('')
  const [conflito, setConflito] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Atualiza profId se a prop mudar (ex.: trocar de profissional logado)
  useEffect(() => {
    if (profissionalIdPreSelecionado) setProfId(profissionalIdPreSelecionado)
  }, [profissionalIdPreSelecionado])


  const servico = useMemo(() => servicos.find((s) => s.id === servId), [servicos, servId])

  // Busca cliente em tempo real (debounce simples)
  useEffect(() => {
    if (!tenant?.id || busca.length < 2) {
      setResultados([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .eq('tenant_id', tenant.id)
        .or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)
        .limit(5)
      setResultados((data ?? []) as ClienteBusca[])
    }, 250)
    return () => clearTimeout(t)
  }, [busca, tenant?.id])

  // Verifica conflito quando profissional/data/hora/servico mudam
  useEffect(() => {
    if (!profId || !servico) {
      setConflito(false)
      return
    }
    const inicio = new Date(`${data}T${hora}:00`)
    const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60_000)
    supabase
      .from('agendamentos')
      .select('id')
      .eq('profissional_id', profId)
      .neq('status', 'cancelado')
      .lt('data_hora_inicio', fim.toISOString())
      .gt('data_hora_fim', inicio.toISOString())
      .then(({ data }) => setConflito((data ?? []).length > 0))
  }, [profId, servico, data, hora])

  const limpar = () => {
    setBusca('')
    setClienteId(null)
    setClienteNome('')
    setProfId('')
    setServId('')
    setObs('')
    setConflito(false)
  }

  const salvar = async () => {
    if (!tenant?.id || !servico) return
    setSalvando(true)
    try {
      let idCliente = clienteId
      // Se não selecionou nenhum, cria com o que digitou
      if (!idCliente) {
        const nome = clienteNome.trim() || busca.trim()
        if (!nome) {
          toast.error('Informe o nome do cliente')
          setSalvando(false)
          return
        }
        const { data: novo, error } = await supabase
          .from('clientes')
          .insert({ tenant_id: tenant.id, nome, telefone: busca.trim() || 'sem telefone' })
          .select('id')
          .single()
        if (error) throw error
        idCliente = novo.id
      }
      const inicio = new Date(`${data}T${hora}:00`)
      const fim = new Date(inicio.getTime() + servico.duracao_minutos * 60_000)
      const { error } = await supabase.from('agendamentos').insert({
        tenant_id: tenant.id,
        cliente_id: idCliente!,
        profissional_id: profId,
        servico_id: servId,
        data_hora_inicio: inicio.toISOString(),
        data_hora_fim: fim.toISOString(),
        status: 'agendado',
        origem: 'painel',
        observacoes: obs || null,
      })
      if (error) throw error
      toast.success('Agendamento criado')
      limpar()
      onCriado()
      onFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>Preencha os dados abaixo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input
              placeholder="Buscar por nome ou telefone…"
              value={clienteId ? clienteNome : busca}
              onChange={(e) => {
                setClienteId(null)
                setBusca(e.target.value)
              }}
            />
            {!clienteId && resultados.length > 0 && (
              <div className="rounded border bg-popover">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setClienteId(c.id)
                      setClienteNome(c.nome)
                    }}
                  >
                    <span>{c.nome}</span>
                    <span className="text-xs text-muted-foreground">{c.telefone}</span>
                  </button>
                ))}
              </div>
            )}
            {!clienteId && busca.length >= 2 && resultados.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum cliente encontrado — será criado um novo com este nome/telefone.
              </p>
            )}
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={profId} onValueChange={setProfId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={servId} onValueChange={setServId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome} ({s.duracao_minutos}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data e hora */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>

          {conflito && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              ⚠️ Este profissional já tem um agendamento neste horário.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !profId || !servId || conflito}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
