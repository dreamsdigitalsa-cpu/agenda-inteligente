// Modal de criar/editar cliente.
// Em modo edição, recebe `cliente`. Em modo criação, recebe `tenantId`.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mascararTelefone, apenasDigitos } from '@/lib/mascaras'
import { atualizarCliente, criarCliente } from '@/hooks/useClientes'
import type { Cliente } from '@/tipos/cliente'

interface Props {
  aberto: boolean
  aoFechar: () => void
  aoSalvar?: (c: Cliente) => void
  tenantId: string | null
  cliente?: Cliente | null
}

const FONTES = [
  'Indicação',
  'Instagram',
  'Google',
  'Passou em frente',
  'Outro',
] as const

export function ModalCliente({ aberto, aoFechar, aoSalvar, tenantId, cliente }: Props) {
  const ehEdicao = !!cliente
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [comoConheceu, setComoConheceu] = useState<string>('')
  const [observacoes, setObservacoes] = useState('')
  const [temConta, setTemConta] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setNome(cliente?.nome ?? '')
      setTelefone(cliente?.telefone ? mascararTelefone(cliente.telefone) : '')
      setEmail(cliente?.email ?? '')
      setDataNascimento(cliente?.dataNascimento ?? '')
      setComoConheceu(cliente?.comoConheceu ?? '')
      setObservacoes(cliente?.observacoes ?? '')
      setTemConta(cliente?.temConta ?? false)
    }
  }, [aberto, cliente])

  async function handleSalvar() {
    if (!nome.trim()) {
      toast.error('Informe o nome do cliente')
      return
    }
    const tel = apenasDigitos(telefone)
    if (tel.length < 10) {
      toast.error('Telefone inválido')
      return
    }
    setSalvando(true)
    try {
      const payload = {
        nome: nome.trim(),
        telefone: tel,
        email: email.trim() || null,
        dataNascimento: dataNascimento || null,
        comoConheceu: comoConheceu || null,
        observacoes: observacoes.trim() || null,
        temConta,
      }
      let salvo: Cliente
      if (ehEdicao && cliente) {
        salvo = await atualizarCliente(cliente.id, payload)
        toast.success('Cliente atualizado')
      } else {
        if (!tenantId) {
          toast.error('Tenant não identificado')
          setSalvando(false)
          return
        }
        salvo = await criarCliente(tenantId, payload)
        toast.success('Cliente cadastrado')
        // TODO: se temConta=true, disparar convite por email (Edge Function futura).
      }
      aoSalvar?.(salvo)
      aoFechar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar cliente')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ehEdicao ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            {ehEdicao ? 'Atualize os dados do cliente.' : 'Cadastre um novo cliente do estabelecimento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                placeholder="(11) 99999-0000"
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nascimento">Data de nascimento</Label>
              <Input
                id="nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Como nos conheceu?</Label>
            <Select value={comoConheceu} onValueChange={setComoConheceu}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {FONTES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obs">Observações internas</Label>
            <Textarea id="obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="conta" className="text-sm font-medium">
                Tem conta no sistema?
              </Label>
              <p className="text-xs text-muted-foreground">Ao ativar, será enviado um convite por email.</p>
            </div>
            <Switch id="conta" checked={temConta} onCheckedChange={setTemConta} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
