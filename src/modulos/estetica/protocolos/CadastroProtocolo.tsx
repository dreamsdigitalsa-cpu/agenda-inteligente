import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/cliente';
import { toast } from 'sonner';

const protocolSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  numero_sessoes: z.coerce.number().min(1, 'Mínimo de 1 sessão'),
  intervalo_minimo_dias: z.coerce.number().min(0, 'Intervalo não pode ser negativo'),
});

interface CadastroProtocoloProps {
  tenantId: string;
  onSuccess?: () => void;
}

/**
 * Formulário para cadastrar novos protocolos estéticos.
 */
export const CadastroProtocolo: React.FC<CadastroProtocoloProps> = ({ tenantId, onSuccess }) => {
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof protocolSchema>>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      nome: '',
      numero_sessoes: 1,
      intervalo_minimo_dias: 7,
    },
  });

  const onSubmit = async (values: z.infer<typeof protocolSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('estetica_protocolos')
        .insert({
          tenant_id: tenantId,
          nome: values.nome,
          numero_sessoes: values.numero_sessoes,
          intervalo_minimo_dias: values.intervalo_minimo_dias,
        } as any);

      if (error) throw error;

      toast.success('Protocolo cadastrado com sucesso!');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error('Erro ao salvar protocolo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-card">
      <h2 className="text-xl font-bold mb-4">Novo Protocolo Estético</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Protocolo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Limpeza de Pele profunda" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="numero_sessoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº de Sessões</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="intervalo_minimo_dias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo Mín. (Dias)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Cadastrar Protocolo'}
          </Button>
        </form>
      </Form>
    </div>
  );
};
