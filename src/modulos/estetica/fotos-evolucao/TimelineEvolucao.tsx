import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History } from 'lucide-react';

interface FotoEvolucao {
  id: string;
  foto_url: string;
  tipo: 'antes' | 'depois' | 'atual';
  data_foto: string;
}

interface TimelineEvolucaoProps {
  clienteId: string;
  protocoloId?: string;
}

/**
 * Timeline visual de evolução do cliente.
 * Lista todas as fotos em ordem cronológica com URLs assinadas para privacidade.
 */
export const TimelineEvolucao: React.FC<TimelineEvolucaoProps> = ({ clienteId, protocoloId }) => {
  const [fotos, setFotos] = useState<FotoEvolucao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarFotos = async () => {
      setLoading(true);
      let query = supabase
        .from('estetica_fotos_evolucao')
        .select('id, foto_url, tipo, data_foto')
        .eq('cliente_id', clienteId)
        .order('data_foto', { ascending: false });

      if (protocoloId) {
        query = query.eq('protocolo_id', protocoloId);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Gerar URLs assinadas para cada foto para garantir acesso privado
        const fotosComUrl = await Promise.all(data.map(async (f: any) => {
          // Tenta extrair o path do bucket da URL salva
          const urlParts = f.foto_url.split('/');
          const esteticaIndex = urlParts.indexOf('estetica');
          const path = esteticaIndex !== -1 ? urlParts.slice(esteticaIndex + 1).join('/').split('?')[0] : f.foto_url;
          
          const { data: signedData } = await supabase.storage
            .from('estetica')
            .createSignedUrl(path, 3600);
            
          return { ...f, foto_url: signedData?.signedUrl || f.foto_url };
        }));
        setFotos(fotosComUrl as FotoEvolucao[]);
      }
      setLoading(false);
    };

    carregarFotos();
  }, [clienteId, protocoloId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (fotos.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-xl">
        <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Nenhum registro fotográfico encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        Histórico de Evolução
      </h3>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-8">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative pl-8">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-background" />
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {format(new Date(foto.data_foto), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <Badge variant="outline" className="capitalize text-[10px] h-5">
                    {foto.tipo}
                  </Badge>
                </div>
                
                <Card className="overflow-hidden w-full max-w-sm hover:ring-2 hover:ring-primary transition-all">
                  <img 
                    src={foto.foto_url} 
                    alt={`Evolução ${foto.tipo}`} 
                    className="w-full h-auto object-cover max-h-64"
                  />
                  <div className="p-2 bg-muted/30 text-[10px] text-muted-foreground text-right">
                    Registrado às {format(new Date(foto.data_foto), 'HH:mm')}
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
