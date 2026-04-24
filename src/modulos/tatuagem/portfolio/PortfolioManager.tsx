import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { useTenant } from '@/hooks/useTenant';
import { useProfissionais } from '@/hooks/useProfissionais';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload, Grid, List, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TattooPortfolioItem } from '../tipos';

export function PortfolioManager() {
  const { tenant } = useTenant();
  const { profissionais } = useProfissionais();
  
  const [items, setItems] = useState<TattooPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedProf, setSelectedProf] = useState<string>('all');
  
  const [newItem, setNewItem] = useState({
    profissional_id: '',
    estilo: '',
    categoria: '',
    descricao: '',
  });

  useEffect(() => {
    if (tenant?.id) carregarPortfolio();
  }, [tenant?.id, selectedProf]);

  async function carregarPortfolio() {
    try {
      setLoading(true);
      let query = supabase
        .from('tattoo_portfolio_items')
        .select('*, profissional:profissionais(nome)')
        .order('criado_em', { ascending: false });

      if (selectedProf !== 'all') {
        query = query.eq('profissional_id', selectedProf);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !newItem.profissional_id || !newItem.estilo) {
      toast.error('Selecione o profissional e o estilo antes do upload.');
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${tenant?.id}/portfolio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tattoo-portfolio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tattoo-portfolio')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('tattoo_portfolio_items')
        .insert([{
          tenant_id: tenant?.id,
          profissional_id: newItem.profissional_id,
          imagem_url: publicUrl,
          estilo: newItem.estilo,
          categoria: newItem.categoria,
          descricao: newItem.descricao,
        }]);

      if (insertError) throw insertError;

      toast.success('Trabalho adicionado ao portfólio!');
      carregarPortfolio();
      setNewItem({ ...newItem, categoria: '', descricao: '' });
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Deseja remover este item do portfólio?')) return;

    const { error } = await supabase
      .from('tattoo_portfolio_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir');
    } else {
      setItems(items.filter(i => i.id !== id));
      toast.success('Removido com sucesso');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Portfólio do Tatuador</h1>
          <p className="text-zinc-500">Exiba os melhores trabalhos para atrair novos clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Novo Trabalho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select 
                value={newItem.profissional_id} 
                onValueChange={(val) => setNewItem({...newItem, profissional_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estilo</Label>
              <Input 
                value={newItem.estilo} 
                onChange={e => setNewItem({...newItem, estilo: e.target.value})}
                placeholder="Ex: Realismo, Blackwork"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria (Opcional)</Label>
              <Input 
                value={newItem.categoria} 
                onChange={e => setNewItem({...newItem, categoria: e.target.value})}
                placeholder="Ex: Braço, Costas"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={newItem.descricao} 
                onChange={e => setNewItem({...newItem, descricao: e.target.value})}
                placeholder="Pequena descrição..."
              />
            </div>

            <div className="pt-4">
              <label className={`
                flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
                hover:bg-zinc-50 transition-colors
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}>
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                    <span className="text-sm font-medium text-zinc-600">Fazer Upload</span>
                    <span className="text-xs text-zinc-400">PNG, JPG ou WebP</span>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleUpload} 
                  disabled={uploading}
                  accept="image/*"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4 bg-white p-2 border rounded-lg">
            <Select value={selectedProf} onValueChange={setSelectedProf}>
              <SelectTrigger className="w-48 border-none focus:ring-0 shadow-none">
                <SelectValue placeholder="Filtrar Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Profissionais</SelectItem>
                {profissionais.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-zinc-50 border-2 border-dashed rounded-xl">
              <ImageIcon className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
              <h3 className="text-lg font-medium text-zinc-900">Portfólio vazio</h3>
              <p className="text-zinc-500">Faça o upload dos seus primeiros trabalhos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div key={item.id} className="group relative aspect-square bg-zinc-100 rounded-lg overflow-hidden border">
                  <img 
                    src={item.imagem_url} 
                    alt={item.estilo} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/70">{item.estilo}</p>
                    <p className="text-sm font-medium truncate">{item.profissional?.nome}</p>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-md hover:bg-red-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
