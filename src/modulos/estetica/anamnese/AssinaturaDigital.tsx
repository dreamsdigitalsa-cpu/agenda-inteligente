import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

interface AssinaturaDigitalProps {
  onSave: (signatureDataUrl: string) => void;
  onClear?: () => void;
}

/**
 * Componente de assinatura digital utilizando Canvas.
 * Permite ao cliente assinar a anamnese.
 */
export const AssinaturaDigital: React.FC<AssinaturaDigitalProps> = ({ onSave, onClear }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const limpar = () => {
    sigCanvas.current?.clear();
    onClear?.();
  };

  const salvar = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-medium text-slate-900">Assinatura Digital</h3>
      <div className="border-2 border-dashed border-slate-200 rounded-md overflow-hidden bg-slate-50">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: "w-full h-48 cursor-crosshair",
            style: { width: '100%', height: '192px' }
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={limpar} className="flex items-center gap-2">
          <Eraser className="w-4 h-4" />
          Limpar
        </Button>
        <Button size="sm" onClick={salvar} className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          Confirmar Assinatura
        </Button>
      </div>
    </div>
  );
};
