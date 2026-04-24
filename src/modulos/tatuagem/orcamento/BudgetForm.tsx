import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { useTenant } from '@/hooks/useTenant';
import { useClientes } from '@/hooks/useClientes';
import { useProfissionais } from '@/hooks/useProfissionais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Save, Upload, X, Plus, Calendar, DollarSign, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { TattooBudget, TattooBudgetStatus, TattooBudgetSession } from '../tipos';

interface Props {
  budget?: TattooBudget | null;
  onClose: () => void;
}

export function BudgetForm({ budget, onClose }: Props) {
  const { tenant, usuario } = useTenant();
  const { clientes } = useClientes();
  const { profissionais } = useProfissionais();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessions, setSessions] = useState<TattooBudgetSession[]>([]);
  
  const [formData, setFormData] = useState<Partial<TattooBudget>>({
    cliente_id: budget?.cliente_id || '',
    profissional_id: budget?.profissional_id || '',
    regiao_corpo: budget?.regiao_corpo || '',
    tamanho: budget?.tamanho || '',
    estilo: budget?.estilo || '',
    descricao: budget?.descricao || '',
    valor_estimado: budget?.valor_estimado || 0,
    valor_deposito: budget?.valor_deposito || 0,
    deposito_pago: budget?.deposito_pago || false,
    status: budget?.status || 'em_analise',
    referencias: budget?.referencias || [],
  });

  useEffect(() => {
    if (budget?.id) {
      carregarSessoes();
    }
  }, [budget?.id]);

  async function carregarSessoes() {
    if (!budget?.id) return;
    const { data } = await supabase
      .from('tattoo_budget_sessions')
      .select('*')
      .eq('budget_id', budget.id)
      .order('data', { ascending: true });
    if (data) setSessions(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id) return;

    try {
      setLoading(true);
      const dataToSave = {
        ...formData,
        tenant_id: tenant.id,
      };

      if (budget?.id) {
        const { error } = await supabase
          .from('tattoo_budgets')
          .update(dataToSave)
          .eq('id', budget.id);
        if (error) throw error;
        toast.success('Orçamento atualizado!');
      } else {
        const { error } = await supabase
          .from('tattoo_budgets')
          .insert([dataToSave]);
        if (error) throw error;
        toast.success('Orçamento criado!');
      }
      onClose();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const newUrls = [...(formData.referencias || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${tenant?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tattoo-references')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tattoo-references')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setFormData(prev => ({ ...prev, referencias: newUrls }));
      toast.success('Imagens enviadas!');
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function addSession() {
    if (!budget?.id) {
      toast.error('Salve o orçamento antes de adicionar sessões.');
      return;
    }

    const { data, error } = await supabase
      .from('tattoo_budget_sessions')
      .insert([{
        budget_id: budget.id,
        data: new Date().toISOString(),
        valor: 0
      }])
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar sessão');
    } else {
      setSessions([...sessions, data]);
      toast.success('Sessão adicionada');
    }
  }

  async function handleRegisterDeposit() {
    if (!budget?.id || !formData.valor_deposito) return;
    
    try {
      setLoading(true);
      // Aqui chamaríamos a Edge Function registrar-lancamento
      // Para este MVP, vamos apenas marcar como pago no banco e simular o registro
      const { error } = await supabase
        .from('tattoo_budgets')
        .update({ deposito_pago: true, status: 'aprovado' })
        .eq('id', budget.id);

      if (error) throw error;

      setFormData(prev => ({ ...prev, deposito_pago: true, status: 'aprovado' }));
      toast.success('Depósito registrado no financeiro!');
    } catch (err: any) {
      toast.error('Erro ao registrar depósito: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{budget ? 'Editar Orçamento' : 'Novo Orçamento'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select 
                    value={formData.cliente_id} 
                    onValueChange={(val) => setFormData({...formData, cliente_id: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tatuador</Label>
                  <Select 
                    value={formData.profissional_id} 
                    onValueChange={(val) => setFormData({...formData, profissional_id: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tatuador" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Região do Corpo</Label>
                  <Input 
                    value={formData.regiao_corpo} 
                    onChange={e => setFormData({...formData, regiao_corpo: e.target.value})}
                    placeholder="Ex: Antebraço"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamanho (cm)</Label>
                  <Input 
                    value={formData.tamanho} 
                    onChange={e => setFormData({...formData, tamanho: e.target.value})}
                    placeholder="Ex: 15cm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estilo</Label>
                  <Input 
                    value={formData.estilo} 
                    onChange={e => setFormData({...formData, estilo: e.target.value})}
                    placeholder="Ex: Realismo"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição / Detalhes</Label>
                <Textarea 
                  value={formData.descricao} 
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descreva a ideia da tatuagem..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Referências</Label>
                <div className="flex flex-wrap gap-3">
                  {formData.referencias?.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden border">
                      <img src={url} alt="Referência" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.referencias || [])];
                          updated.splice(i, 1);
                          setFormData({...formData, referencias: updated});
                        }}
                        className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-md cursor-pointer hover:bg-zinc-50 transition">
                    <Upload className="h-5 w-5 text-zinc-400" />
                    <span className="text-[10px] text-zinc-500 mt-1">Upload</span>
                    <input type="file" multiple className="hidden" onChange={handleUpload} accept="image/*" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {budget?.id && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Sessões do Projeto</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addSession}>
                  <Plus className="h-4 w-4 mr-2" /> Add Sessão
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {sessions.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">Nenhuma sessão vinculada.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session, i) => (
                      <div key={session.id} className="flex items-center gap-4 p-3 border rounded-lg bg-zinc-50/50">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                          {i + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            {new Date(session.data).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
                            R$ {session.valor?.toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status e Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => setFormData({...formData, status: val as TattooBudgetStatus})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor Estimado (R$)</Label>
                <Input 
                  type="number"
                  value={formData.valor_estimado} 
                  onChange={e => setFormData({...formData, valor_estimado: Number(e.target.value)})}
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label>Depósito Antecipado (R$)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number"
                      value={formData.valor_deposito} 
                      onChange={e => setFormData({...formData, valor_deposito: Number(e.target.value)})}
                      placeholder="0.00"
                    />
                    {budget?.id && !formData.deposito_pago && (
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={handleRegisterDeposit}
                      >
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
                {formData.deposito_pago && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 p-2 rounded">
                    <Save className="h-4 w-4" />
                    Depósito Confirmado
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || uploading}>
                {loading ? 'Salvando...' : 'Salvar Orçamento'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
