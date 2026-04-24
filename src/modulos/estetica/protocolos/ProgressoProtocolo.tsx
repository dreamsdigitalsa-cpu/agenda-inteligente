import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface ProgressoProtocoloProps {
  clienteId: string;
  protocoloId: string;
}

/**
 * Visualizador de progresso de um protocolo específico para um cliente.
 * Mostra sessões realizadas, progresso e alertas de intervalo.
 */
export const ProgressoProtocolo: React.FC<ProgressoProtocoloProps> = ({ clienteId, protocoloId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarProgresso = async () => {
      setLoading(true);
      // Busca o protocolo e os agendamentos vinculados
      const { data: protocolo } = await supabase
        .from('estetica_protocolos')
        .select('*')
        .eq('id', protocoloId)
        .single();

      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio, numero_sessao, status')
        .eq('cliente_id', clienteId)
        .eq('protocolo_id', protocoloId)
        .order('numero_sessao', { ascending: true });

      if (protocolo) {
        setData({
          protocolo,
          agendamentos: agendamentos || []
        });
      }
      setLoading(false);
    };

    carregarProgresso();
  }, [clienteId, protocoloId]);

  if (loading) return <Loader2 className="animate-spin mx-auto my-4" />;
  if (!data) return null;

  const { protocolo, agendamentos } = data;
  const sessoesRealizadas = agendamentos.filter((a: any) => a.status === 'concluido').length;
  const porcentagem = Math.min((sessoesRealizadas / protocolo.numero_sessoes) * 100, 100);

  // Verificar intervalo entre a última e a penúltima sessão (exemplo simples)
  let alertaIntervalo = false;
  if (agendamentos.length >= 2) {
    const ultima = new Date(agendamentos[agendamentos.length - 1].data_hora_inicio);
    const penultima = new Date(agendamentos[agendamentos.length - 2].data_hora_inicio);
    const diff = differenceInDays(ultima, penultima);
    if (diff < protocolo.intervalo_minimo_dias) {
      alertaIntervalo = true;
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{protocolo.nome}</h3>
          <p className="text-sm text-muted-foreground">
            Sessão {sessoesRealizadas} de {protocolo.numero_sessoes}
          </p>
        </div>
        <Badge variant={porcentagem === 100 ? 'default' : 'outline'}>
          {porcentagem === 100 ? 'Finalizado' : 'Em Andamento'}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Progresso</span>
          <span>{Math.round(porcentagem)}%</span>
        </div>
        <Progress value={porcentagem} className="h-2" />
      </div>

      {alertaIntervalo && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>
            <strong>Alerta de Intervalo:</strong> O intervalo mínimo de {protocolo.intervalo_minimo_dias} dias entre sessões não foi respeitado no último agendamento.
          </p>
        </div>
      )}

      <div className="pt-2">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Últimas Sessões
        </h4>
        <div className="space-y-2">
          {agendamentos.slice(-3).reverse().map((ag: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-muted/50 rounded">
              <span className="flex items-center gap-2">
                <CheckCircle2 className={`w-3 h-3 ${ag.status === 'concluido' ? 'text-green-500' : 'text-slate-400'}`} />
                Sessão #{ag.numero_sessao}
              </span>
              <span>{format(new Date(ag.data_hora_inicio), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
