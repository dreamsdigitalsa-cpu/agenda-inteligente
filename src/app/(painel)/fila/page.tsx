'use client'

import { useState, useMemo } from 'react'
import { useTenant } from '@/hooks/useTenant'
import { useFila } from '@/hooks/useFila'
import { useServicos } from '@/hooks/useServicos'
import { useProfissionais } from '@/hooks/useProfissionais'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Plus, 
  Play, 
  Check, 
  X, 
  GripVertical, 
  Tv, 
  Clock 
} from 'lucide-react'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'

export default function GestaoFilaPage() {
  const { tenant, usuario, carregando: carregandoTenant } = useTenant()
  const { fila, carregando, adicionarNaFila, chamarProximo, finalizarAtendimento, reordenarFila } = useFila(tenant?.id, usuario?.unidadeId || undefined)
  const { servicos } = useServicos()
  const { profissionais } = useProfissionais()
  const navigate = useNavigate()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    servicoId: '',
    profissionalId: ''
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = fila.findIndex((i) => i.id === active.id)
      const newIndex = fila.findIndex((i) => i.id === over.id)
      reordenarFila(arrayMove(fila, oldIndex, newIndex))
    }
  }

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    await adicionarNaFila({
      clienteNome: novoCliente.nome,
      clienteTelefone: novoCliente.telefone,
      servicoId: novoCliente.servicoId || null,
      profissionalId: novoCliente.profissionalId || null
    })
    setIsModalOpen(false)
    setNovoCliente({ nome: '', telefone: '', servicoId: '', profissionalId: '' })
  }

  // Estimativa de espera
  const tempoEstimadoTotal = useMemo(() => {
    return fila
      .filter(i => i.status === 'aguardando')
      .reduce((acc, item) => {
        const servico = servicos.find(s => s.id === item.servicoId)
        return acc + (servico?.duracao_minutos || 30)
      }, 0)
  }, [fila, servicos])

  if (carregandoTenant || carregando) {
    return <div className="p-8">Carregando gerenciador de fila...</div>
  }

  if (tenant?.segmento !== 'barbearia') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Módulo exclusivo para Barbearias</h2>
        <p className="text-muted-foreground">O segmento atual do seu estabelecimento é: {tenant?.segmento}</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila de Espera</h1>
          <p className="text-muted-foreground">Gerencie os clientes que aguardam atendimento hoje.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/fila/tv')}>
            <Tv className="mr-2 h-4 w-4" />
            Abrir Painel TV
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo na Fila
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar à Fila</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdicionar} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Cliente</Label>
                  <Input 
                    id="nome" 
                    required 
                    value={novoCliente.nome}
                    onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                  <Input 
                    id="telefone" 
                    placeholder="(00) 00000-0000"
                    value={novoCliente.telefone}
                    onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Serviço</Label>
                    <Select 
                      value={novoCliente.servicoId} 
                      onValueChange={v => setNovoCliente({...novoCliente, servicoId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicos.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profissional</Label>
                    <Select 
                      value={novoCliente.profissionalId} 
                      onValueChange={v => setNovoCliente({...novoCliente, profissionalId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer um" />
                      </SelectTrigger>
                      <SelectContent>
                        {profissionais.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">Adicionar Cliente</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes na Fila</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fila.filter(i => i.status === 'aguardando').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo de Espera Est.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tempoEstimadoTotal} min</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sendo Chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fila.filter(i => i.status === 'chamado').length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Fila Ativa
        </h2>
        
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={fila.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {fila.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Nenhum cliente na fila no momento.</p>
                </div>
              ) : (
                fila.map((item, index) => (
                  <SortableItem 
                    key={item.id} 
                    item={item} 
                    index={index}
                    onChamar={() => chamarProximo(item.id)}
                    onFinalizar={() => finalizarAtendimento(item.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

function SortableItem({ item, index, onChamar, onFinalizar }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isChamado = item.status === 'chamado'

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center gap-4 bg-card border rounded-lg p-4 shadow-sm group ${isChamado ? 'border-primary bg-primary/5' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary transition-colors">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-primary">{index + 1}º</span>
          <h3 className="font-semibold truncate">{item.clienteNome}</h3>
          {isChamado && (
            <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold animate-pulse">
              CHAMADO
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{item.servicoNome || 'Serviço não informado'}</span>
          <span>•</span>
          <span>Prof: {item.profissionalNome || 'Qualquer'}</span>
          <span>•</span>
          <span>Espera: {formatDistanceToNow(new Date(item.entradaEm), { locale: ptBR })}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isChamado ? (
          <Button size="sm" onClick={onChamar}>
            <Play className="h-4 w-4 mr-2" />
            Chamar
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50" onClick={onFinalizar}>
            <Check className="h-4 w-4 mr-2" />
            Atendido
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
