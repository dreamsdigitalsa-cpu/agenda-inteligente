import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FotoEvolucao {
  id: string;
  foto_url: string;
  tipo: 'antes' | 'depois' | 'atual';
  data_foto: string;
}

interface ComparativoFotosProps {
  fotos: FotoEvolucao[];
}

/**
 * Visualização lado a lado de fotos de evolução.
 * Organiza em slots: Antes, Depois e Atual.
 */
export const ComparativoFotos: React.FC<ComparativoFotosProps> = ({ fotos }) => {
  const getFotoPorTipo = (tipo: 'antes' | 'depois' | 'atual') => {
    return fotos
      .filter(f => f.tipo === tipo)
      .sort((a, b) => new Date(b.data_foto).getTime() - new Date(a.data_foto).getTime())[0];
  };

  const antes = getFotoPorTipo('antes');
  const depois = getFotoPorTipo('depois');
  const atual = getFotoPorTipo('atual');

  const slots = [
    { label: 'Antes', data: antes, color: 'bg-slate-500' },
    { label: 'Depois', data: depois, color: 'bg-green-500' },
    { label: 'Atual', data: atual, color: 'bg-blue-500' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2">
      {slots.map((slot) => (
        <Card key={slot.label} className="relative overflow-hidden group border-2 hover:border-primary transition-all">
          <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center relative">
            {slot.data ? (
              <>
                <img 
                  src={slot.data.foto_url} 
                  alt={slot.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 text-white text-[10px] flex justify-between">
                  <span>{format(new Date(slot.data.data_foto), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  <span>{format(new Date(slot.data.data_foto), 'HH:mm')}</span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-sm italic flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse" />
                Sem foto "{slot.label}"
              </div>
            )}
            <Badge className={`absolute top-2 left-2 ${slot.color} border-none`}>
              {slot.label}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};
