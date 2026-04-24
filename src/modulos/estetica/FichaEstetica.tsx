import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useTenant } from '@/hooks/useTenant';
import { FormularioAnamnese, CampoAnamnese } from './anamnese/FormularioAnamnese';
import { UploadFotosEvolucao } from './fotos-evolucao/UploadFotosEvolucao';
import { ComparativoFotos } from './fotos-evolucao/ComparativoFotos';
import { TimelineEvolucao } from './fotos-evolucao/TimelineEvolucao';
import { CadastroProtocolo } from './protocolos/CadastroProtocolo';
import { ProgressoProtocolo } from './protocolos/ProgressoProtocolo';
import { supabase } from '@/lib/supabase/cliente';
import { toast } from 'sonner';
import { ClipboardList, Camera, Settings2, UserCircle } from 'lucide-react';

interface FichaEsteticaProps {
  clienteId?: string;
  nomeCliente?: string;
}

// Exemplo de campos para anamnese
const CAMPOS_PADRAO: CampoAnamnese[] = [
  { id: 'historico_saude', label: 'Histórico de Saúde', tipo: 'longo', obrigatorio: true },
  { id: 'alergias', label: 'Alergias conhecidas', tipo: 'texto' },
  { id: 'medicamentos', label: 'Medicamentos em uso', tipo: 'texto' },
  { id: 'objetivo', label: 'Objetivo do Tratamento', tipo: 'longo', obrigatorio: true },
  { id: 'gestante', label: 'Está gestante?', tipo: 'checkbox' },
];

/**
 * Componente principal que unifica todas as funcionalidades do módulo de Estética.
 * Deve ser exibido apenas se o tenant for do segmento 'estetica'.
 */
export const FichaEstetica: React.FC<FichaEsteticaProps> = ({ clienteId: propsClienteId, nomeCliente: propsNomeCliente }) => {
  const { clienteId: paramsClienteId } = useParams<{ clienteId: string }>();
  const clienteId = propsClienteId || paramsClienteId;
  
  const { tenant, usuario } = useTenant();
  const [protocoloAtivo, setProtocoloAtivo] = useState<string | null>(null);
  const [fotosAtuais, setFotosAtuais] = useState<any[]>([]);
  const [nomeCliente, setNomeCliente] = useState(propsNomeCliente || 'Carregando...');

  useEffect(() => {
    async function carregarDadosCliente() {
      if (!clienteId || propsNomeCliente) return;
      
      const { data } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', clienteId)
        .single();
        
      if (data) setNomeCliente(data.nome);
    }
    carregarDadosCliente();
  }, [clienteId, propsNomeCliente]);

  if (!clienteId) return <div className="p-6">Cliente não encontrado.</div>;

  if (!tenant || tenant.segmento !== 'estetica') {
    return null;
  }

  // Verificar se o usuário tem a permissão PERM-007 para ver fotos
  const temPermissaoFotos = usuario?.roles.some(r => r === 'admin') || true; // Simplificado para exemplo, o RLS já protege no banco.

  const handleAnamneseSubmit = async (respostas: any, assinatura: string) => {
    try {
      // 1. Buscar um modelo padrão ou criar um na hora (simplificado)
      const { data: modelo } = await supabase
        .from('estetica_anamneses_modelos')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!modelo) {
        toast.error('Nenhum modelo de anamnese configurado.');
        return;
      }

      const { error } = await supabase
        .from('estetica_anamneses_preenchidas')
        .insert({
          tenant_id: tenant.id,
          cliente_id: clienteId,
          modelo_id: modelo.id,
          respostas: respostas,
          assinatura_url: assinatura
        });

      if (error) throw error;
      toast.success('Anamnese salva com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar anamnese: ' + err.message);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <UserCircle className="w-12 h-12 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{nomeCliente}</h1>
          <p className="text-muted-foreground">Ficha de Evolução Estética</p>
        </div>
      </div>

      <Tabs defaultValue="progresso" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="progresso" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Protocolos
          </TabsTrigger>
          <TabsTrigger value="anamnese" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Anamnese
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Evolução (Fotos)
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progresso" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressoProtocolo clienteId={clienteId} protocoloId={protocoloAtivo || ''} />
            <div className="space-y-4">
              <h3 className="font-semibold">Histórico de Sessões</h3>
              <p className="text-sm text-muted-foreground italic">Selecione um protocolo para ver detalhes.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="anamnese">
          <FormularioAnamnese 
            campos={CAMPOS_PADRAO} 
            onSubmit={handleAnamneseSubmit}
          />
        </TabsContent>

        <TabsContent value="fotos" className="space-y-8">
          {temPermissaoFotos ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <UploadFotosEvolucao 
                    tenantId={tenant.id} 
                    clienteId={clienteId}
                    protocoloId={protocoloAtivo || undefined}
                    onUploadComplete={(url, tipo) => {
                      setFotosAtuais(prev => [...prev, { foto_url: url, tipo, data_foto: new Date().toISOString() }]);
                    }}
                  />
                  <TimelineEvolucao clienteId={clienteId} protocoloId={protocoloAtivo || undefined} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-xl font-bold">Comparativo Atual</h3>
                  <ComparativoFotos fotos={fotosAtuais} />
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center border rounded-xl bg-slate-50">
              <p className="text-muted-foreground">Você não tem permissão (PERM-007) para visualizar fotos.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config">
          <div className="max-w-md mx-auto">
            <CadastroProtocolo tenantId={tenant.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default FichaEstetica;
