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
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AssinaturaDigital } from './AssinaturaDigital';

export interface CampoAnamnese {
  id: string;
  label: string;
  tipo: 'texto' | 'longo' | 'checkbox' | 'numero';
  obrigatorio?: boolean;
}

interface FormularioAnamneseProps {
  campos: CampoAnamnese[];
  onSubmit: (data: any, assinatura: string) => void;
  carregando?: boolean;
}

/**
 * Renderizador dinâmico de formulário de anamnese.
 * Gera campos baseado em um JSON de configuração.
 */
export const FormularioAnamnese: React.FC<FormularioAnamneseProps> = ({ 
  campos, 
  onSubmit,
  carregando = false 
}) => {
  const [assinatura, setAssinatura] = React.useState<string>('');

  // Construir schema dinâmico com Zod
  const schemaShape: any = {};
  campos.forEach(campo => {
    let fieldSchema: any = z.any();
    if (campo.tipo === 'texto' || campo.tipo === 'longo') {
      fieldSchema = z.string();
      if (campo.obrigatorio) fieldSchema = fieldSchema.min(1, 'Campo obrigatório');
    } else if (campo.tipo === 'numero') {
      fieldSchema = z.string().transform(v => Number(v));
      if (campo.obrigatorio) fieldSchema = fieldSchema.min(1, 'Campo obrigatório');
    } else if (campo.tipo === 'checkbox') {
      fieldSchema = z.boolean().default(false);
    }
    schemaShape[campo.id] = fieldSchema;
  });

  const formSchema = z.object(schemaShape);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: campos.reduce((acc, c) => ({ ...acc, [c.id]: c.tipo === 'checkbox' ? false : '' }), {})
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    if (!assinatura) {
      alert('A assinatura é obrigatória para finalizar a anamnese.');
      return;
    }
    onSubmit(values, assinatura);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-2xl border shadow-sm">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 border-b pb-4">Ficha de Anamnese</h2>
          
          {campos.map((campo) => (
            <FormField
              key={campo.id}
              control={form.control}
              name={campo.id}
              render={({ field }) => (
                <FormItem className={campo.tipo === 'checkbox' ? 'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4' : ''}>
                  {campo.tipo !== 'checkbox' && <FormLabel className="text-slate-700 font-semibold">{campo.label}{campo.obrigatorio && '*'}</FormLabel>}
                  <FormControl>
                    {campo.tipo === 'texto' ? (
                      <Input {...field} placeholder={campo.label} />
                    ) : campo.tipo === 'longo' ? (
                      <Textarea {...field} placeholder={campo.label} className="min-h-[100px]" />
                    ) : campo.tipo === 'numero' ? (
                      <Input {...field} type="number" placeholder={campo.label} />
                    ) : campo.tipo === 'checkbox' ? (
                      <>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {campo.label}
                          </FormLabel>
                        </div>
                      </>
                    ) : null}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <div className="pt-6 border-t">
          <AssinaturaDigital onSave={(data) => setAssinatura(data)} onClear={() => setAssinatura('')} />
          {assinatura && (
            <div className="mt-4 p-2 border rounded bg-green-50 flex items-center gap-2 text-green-700 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Assinatura capturada com sucesso!
            </div>
          )}
        </div>

        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={carregando}>
          {carregando ? 'Salvando...' : 'Finalizar e Gerar Protocolo'}
        </Button>
      </form>
    </Form>
  );
};
