import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, Calendar, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TattooBudget, TattooBudgetStatus } from '../tipos';
import { BudgetForm } from './BudgetForm';

const statusMap: Record<TattooBudgetStatus, { label: string, color: string, icon: any }> = {
  em_analise: { label: 'Em Análise', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  em_andamento: { label: 'Em Andamento', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: PlayCircle },
  concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
};

export function BudgetList() {
  const { tenant } = useTenant();
  const [budgets, setBudgets] = useState<TattooBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<TattooBudget | null>(null);

  useEffect(() => {
    if (tenant?.id) carregarOrcamentos();
  }, [tenant?.id]);

  async function carregarOrcamentos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tattoo_budgets')
        .select(`
          *,
          cliente:clientes(nome, telefone),
          profissional:profissionais(nome)
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBudgets = budgets.filter(b => 
    b.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    b.regiao_corpo.toLowerCase().includes(search.toLowerCase()) ||
    b.estilo.toLowerCase().includes(search.toLowerCase())
  );

  if (showForm) {
    return (
      <BudgetForm 
        budget={editingBudget} 
        onClose={() => {
          setShowForm(false);
          setEditingBudget(null);
          carregarOrcamentos();
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Orçamentos de Tatuagem</h1>
          <p className="text-zinc-500">Gerencie solicitações, depósitos e sessões dos seus clientes.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Buscar por cliente, região ou estilo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Clock className="h-8 w-8 animate-spin text-zinc-300" />
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-zinc-50">
          <FileText className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
          <h3 className="text-lg font-medium text-zinc-900">Nenhum orçamento encontrado</h3>
          <p className="text-zinc-500">Comece criando um novo orçamento para seus clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map((budget) => {
            const status = statusMap[budget.status];
            const StatusIcon = status.icon;

            return (
              <div 
                key={budget.id}
                onClick={() => {
                  setEditingBudget(budget);
                  setShowForm(true);
                }}
                className="group relative bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline" className={`${status.color} flex items-center gap-1.5 px-2.5 py-0.5`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </Badge>
                  <span className="text-xs text-zinc-400 font-medium">
                    {format(new Date(budget.criado_em), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-zinc-900 mb-1">{budget.cliente?.nome}</h3>
                <p className="text-sm text-zinc-500 mb-4 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {budget.regiao_corpo} • {budget.tamanho}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Estilo:</span>
                    <span className="font-medium text-zinc-700">{budget.estilo}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Estimativa:</span>
                    <span className="font-semibold text-zinc-900">
                      {budget.valor_estimado ? `R$ ${budget.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
                    </span>
                  </div>
                </div>

                {budget.valor_deposito && budget.valor_deposito > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Depósito</span>
                    <Badge variant={budget.deposito_pago ? "default" : "secondary"} className={budget.deposito_pago ? "bg-emerald-500" : "bg-amber-100 text-amber-700"}>
                      {budget.deposito_pago ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
