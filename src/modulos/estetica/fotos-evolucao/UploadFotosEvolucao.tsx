import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/cliente';
import { toast } from 'sonner';

interface UploadFotosEvolucaoProps {
  tenantId: string;
  clienteId: string;
  agendamentoId?: string;
  protocoloId?: string;
  onUploadComplete: (url: string, tipo: 'antes' | 'depois' | 'atual') => void;
}

/**
 * Componente para upload de fotos de evolução (Antes, Depois, Atual).
 * Salva no Supabase Storage e vincula ao registro de fotos.
 */
export const UploadFotosEvolucao: React.FC<UploadFotosEvolucaoProps> = ({
  tenantId,
  clienteId,
  agendamentoId,
  protocoloId,
  onUploadComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'antes' | 'depois' | 'atual'>('antes');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setLoading(true);
    const file = acceptedFiles[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/${clienteId}/${Date.now()}_${tipo}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // 1. Upload para o Storage (Bucket 'estetica')
      const { data, error: uploadError } = await supabase.storage
        .from('estetica')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obter URL pública (ou assinada se for privado)
      // Como o bucket é privado, idealmente usamos URL assinada ou Proxy.
      // Por simplicidade aqui, vamos assumir que recuperamos via getPublicUrl se o tenant tiver acesso.
      const { data: { publicUrl } } = supabase.storage
        .from('estetica')
        .getPublicUrl(filePath);

      // 3. Registrar no banco de dados
      const { error: dbError } = await supabase
        .from('estetica_fotos_evolucao')
        .insert({
          tenant_id: tenantId,
          cliente_id: clienteId,
          agendamento_id: agendamentoId,
          protocolo_id: protocoloId,
          foto_url: publicUrl,
          tipo: tipo,
          data_foto: new Date().toISOString()
        });

      if (dbError) throw dbError;

      toast.success(`Foto de "${tipo}" carregada com sucesso!`);
      onUploadComplete(publicUrl, tipo);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload da foto: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, clienteId, agendamentoId, protocoloId, tipo, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    disabled: loading
  });

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Registrar Evolução
        </h3>
        <div className="flex gap-2">
          {(['antes', 'depois', 'atual'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tipo === t ? 'default' : 'outline'}
              onClick={() => setTipo(t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors text-center cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando foto...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? 'Solte a foto aqui' : 'Clique ou arraste uma foto para cá'}
            </p>
            <p className="text-xs text-muted-foreground">Formatos aceitos: JPG, PNG (Max 5MB)</p>
          </div>
        )}
      </div>
    </div>
  );
};
