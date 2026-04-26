'use client'

import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { Loader2 } from 'lucide-react'

interface ModalMovimentacaoProps {
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export function ModalMovimentacao({ aberto, onFechar, onSucesso }: ModalMovimentacaoProps) {
  const { tenant, usuario } = useTenant()
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(false)
  const [produtos, setProdutos] = useState<any[]>([])

  const [form, setForm] = useState({
    produto_id: '',
    tipo: 'entrada',
    quantidade: '',
    motivo: '',
    custo_unitario: '', // Apenas para entrada
  })

  useEffect(() => {
    if (aberto && tenant?.id) {
      supabase
        .from('produtos')
        .select('id, nome')
        .eq('tenant_id', tenant.id)
        .order('nome')
        .then(({ data }) => setProdutos(data || []))
    }
  }, [aberto, tenant?.id])

  async function registrar() {
    if (!form.produto_id || !form.quantidade || !tenant?.id || !usuario?.id) return
    setCarregando(true)

    try {
      // 1. Criar Lote se for entrada
      let lote_id = null
      if (form.tipo === 'entrada') {
        const { data: lote, error: errLote } = await supabase
          .from('lotes_estoque')
          .insert({
            tenant_id: tenant.id,
            produto_id: form.produto_id,
            quantidade: parseFloat(form.quantidade),
            custo_unitario: parseFloat(form.custo_unitario) || 0,
            data_compra: new Date().toISOString().split('T')[0],
          })
          .select()
          .single()
        
        if (errLote) throw errLote
        lote_id = lote.id
      }

      // 2. Registrar Movimentação
      const { error } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          tenant_id: tenant.id,
          produto_id: form.produto_id,
          lote_id: lote_id,
          tipo: form.tipo,
          quantidade: parseFloat(form.quantidade),
          motivo: form.motivo,
          criado_por_usuario_id: usuario.id
        })

      if (error) throw error

      toast({
        title: 'Movimentação registrada!',
        description: 'O estoque foi atualizado com sucesso.',
      })
      onSucesso()
      setForm({
        produto_id: '',
        tipo: 'entrada',
        quantidade: '',
        motivo: '',
        custo_unitario: '',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no registro',
        description: error.message,
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Movimentação de Estoque</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Produto</Label>
            <Select value={form.produto_id} onValueChange={v => setForm(f => ({ ...f, produto_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {produtos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida_venda">Venda</SelectItem>
                  <SelectItem value="saida_uso">Uso Interno</SelectItem>
                  <SelectItem value="ajuste">Ajuste de Saldo</SelectItem>
                  <SelectItem value="perda">Perda / Avaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qtd">Quantidade</Label>
              <Input 
                id="qtd" 
                type="number" 
                value={form.quantidade}
                onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
              />
            </div>
          </div>

          {form.tipo === 'entrada' && (
            <div className="grid gap-2">
              <Label htmlFor="custo">Custo Unitário (R$)</Label>
              <Input 
                id="custo" 
                type="number" 
                placeholder="0,00"
                value={form.custo_unitario}
                onChange={e => setForm(f => ({ ...f, custo_unitario: e.target.value }))}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo / Observação</Label>
            <Input 
              id="motivo" 
              placeholder="Ex: Compra fornecedor X" 
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} className="rounded-full">Cancelar</Button>
          <Button 
            className="rounded-full bg-gradient-primary px-8" 
            onClick={registrar}
            disabled={carregando || !form.produto_id || !form.quantidade}
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
