import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase/cliente';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, MapPin, Calendar, Loader2 } from 'lucide-react';
import type { TattooPortfolioItem } from '../tipos';

export function PublicPortfolio() {
  const { slug } = useParams();
  const [items, setItems] = useState<TattooPortfolioItem[]>([]);
  const [profissional, setProfissional] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) carregarPortfolio();
  }, [slug]);

  async function carregarPortfolio() {
    try {
      setLoading(true);
      
      // Primeiro busca o profissional pelo slug
      const { data: prof, error: profError } = await supabase
        .from('profissionais')
        .select('*, tenant:tenants(nome)')
        .eq('slug', slug)
        .maybeSingle();

      if (profError) throw profError;
      if (!prof) {
        setLoading(false);
        return;
      }

      setProfissional(prof);

      // Depois busca os itens do portfólio
      const { data, error } = await supabase
        .from('tattoo_portfolio_items')
        .select('*')
        .eq('profissional_id', prof.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!profissional) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Portfólio não encontrado</h1>
        <p className="text-zinc-400">O tatuador solicitado não possui um portfólio público ou o link está incorreto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="relative h-[40vh] bg-zinc-900 border-b border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <div className="grid grid-cols-6 gap-2 rotate-12 -translate-y-20">
            {items.slice(0, 12).map((item, i) => (
              <img key={i} src={item.imagem_url} alt="" className="w-full aspect-square object-cover rounded shadow-2xl" />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">{profissional.nome}</h1>
          <div className="flex flex-wrap justify-center gap-3">
            {profissional.especialidade?.split(',').map((esp: string) => (
              <Badge key={esp} variant="outline" className="bg-white/5 border-white/10 text-white px-4 py-1 text-sm">
                {esp.trim()}
              </Badge>
            ))}
          </div>
          <p className="text-zinc-400 flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" /> {profissional.tenant?.nome}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 cursor-zoom-in"
            >
              <img 
                src={item.imagem_url} 
                alt={item.estilo} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">{item.estilo}</span>
                <p className="text-sm text-white line-clamp-2">{item.descricao}</p>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 italic">Nenhum trabalho publicado ainda.</p>
          </div>
        )}
      </div>

      {/* CTA Footer */}
      <div className="bg-zinc-900 border-t border-zinc-800 py-12 px-6 text-center">
        <h2 className="text-2xl font-bold mb-6">Gostou do estilo?</h2>
        <Button size="lg" className="bg-white text-black hover:bg-zinc-200">
          <Calendar className="mr-2 h-5 w-5" /> Agendar Orçamento
        </Button>
      </div>
    </div>
  );
}
