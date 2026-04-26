// Modal para o profissional bloquear um intervalo na própria agenda.
// Tipos suportados: pessoal, almoço, folga, atestado, feriado.
// Permite escolher dia inteiro ou intervalo específico de horas.
// Insere em `bloqueios_agenda` — RLS já garante que só o próprio profissional
// (ou admin) consegue criar bloqueios para si.
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { useTenant } from '@/hooks/useTenant'

const TIPOS_BLOQUEIO = [
  { valor: 'pessoal', rotulo: 'Pessoal' },
  { valor: 'almoco', rotulo: 'Almoço' },
  { valor: 'folga', rotulo: 'Folga' },
  { valor: 'atestado', rotulo: 'Atestado' },
  { valor: 'feriado', rotulo: 'Feriado' },
]

interface Props {
  aberto: boolean
  aoFechar: () => void
  profissionalId: string
  /** Chamado após salvar com sucesso, útil para recarregar a agenda. */
  aoSalvar?: () => void
}

export function ModalBloquearHorario({ aberto, aoFechar, profissionalId, aoSalvar }: Props) {
  const { tenant, usuario } = useTenant()
  const [tipo, setTipo] = useState('pessoal')
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState('12:00')
  const [horaFim, setHoraFim] = useState('13:00')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!tenant || !usuario) return
    setSalvando(true)
    try {
      const inicio = diaInteiro
        ? new Date(`${data}T00:00:00`)
        : new Date(`${data}T${horaInicio}:00`)
      const fim = diaInteiro
        ? new Date(`${data}T23:59:59`)
        : new Date(`${data}T${horaFim}:00`)

      if (fim <= inicio) {
        toast.error('Horário fim deve ser após o início.')
        setSalvando(false)
        return
      }

      const { error } = await supabase.from('bloqueios_agenda').insert({
        tenant_id: tenant.id,
        profissional_id: profissionalId,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        tipo,
        motivo: motivo || null,
        criado_por_usuario_id: usuario.id,
      })

      if (error) throw error
      toast.success('Horário bloqueado com sucesso.')
      aoSalvar?.()
      aoFechar()
    } catch (e) {
      console.error('[ModalBloquearHorario] erro:', e)
      toast.error('Erro ao bloquear horário.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo do bloqueio */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_BLOQUEIO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data do bloqueio */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          {/* Toggle dia inteiro */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label className="cursor-pointer" htmlFor="dia-inteiro">
              Bloquear dia inteiro
            </Label>
            <Switch id="dia-inteiro" checked={diaInteiro} onCheckedChange={setDiaInteiro} />
          </div>

          {/* Intervalo de horas (apenas se não for dia inteiro) */}
          {!diaInteiro && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
              </div>
            </div>
          )}

          {/* Motivo opcional */}
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: consulta médica"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Bloqueando...' : 'Bloquear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
