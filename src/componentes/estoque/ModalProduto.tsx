'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Loader2 } from 'lucide-react'

interface ModalProdutoProps {
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function ModalProduto({ aberto, onFechar, onSucesso }: ModalProdutoProps) {
  const { tenant, usuario } = useTenant()
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    tipo: 'venda',
    preco_venda: '',
    estoque_minimo: '0',
    unidade_medida: 'un',
    codigo_barras: '',
  })

  async function salvar() {
    if (!form.nome || !tenant?.id) return
    setCarregando(true)

    try {
      const { error } = await supabase
        .from('produtos')
        .insert({
          tenant_id: tenant.id,
          unidade_id: usuario?.unidadeId,
          nome: form.nome,
          descricao: form.descricao,
          categoria: form.categoria,
          tipo: form.tipo,
          preco_venda: parseFloat(form.preco_venda) || 0,
          estoque_minimo: parseFloat(form.estoque_minimo) || 0,
          unidade_medida: form.unidade_medida,
          codigo_barras: form.codigo_barras,
        })

      if (error) throw error

      toast({
        title: 'Produto criado!',
        description: `${form.nome} foi adicionado ao catálogo.`,
      })
      onSucesso()
      setForm({
        nome: '',
        descricao: '',
        categoria: '',
        tipo: 'venda',
        preco_venda: '',
        estoque_minimo: '0',
        unidade_medida: 'un',
        codigo_barras: '',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome do produto</Label>
            <Input 
              id="nome" 
              placeholder="Ex: Shampoo Revitalizante" 
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Para Venda</SelectItem>
                  <SelectItem value="uso_interno">Uso Interno</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Input 
                placeholder="Ex: Cabelo" 
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="preco">Preço de Venda</Label>
              <Input 
                id="preco" 
                type="number" 
                placeholder="0,00" 
                value={form.preco_venda}
                onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="min">Estoque Mínimo</Label>
              <Input 
                id="min" 
                type="number" 
                value={form.estoque_minimo}
                onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea 
              id="desc" 
              placeholder="Detalhes do produto..." 
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} className="rounded-full">Cancelar</Button>
          <Button 
            className="rounded-full bg-gradient-primary px-8" 
            onClick={salvar}
            disabled={carregando || !form.nome}
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Produto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
