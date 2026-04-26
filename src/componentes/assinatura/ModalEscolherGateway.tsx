import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreditCard, Banknote, QrCode, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ModalEscolherGatewayProps {
  aberto: boolean
  onFechar: () => void
  onConfirmar: (gateway: 'stripe' | 'asaas' | 'pagarme') => void
  carregando?: boolean
}

export function ModalEscolherGateway({ aberto, onFechar, onConfirmar, carregando }: ModalEscolherGatewayProps) {
  const [selecionado, setSelecionado] = useState<'stripe' | 'asaas' | 'pagarme' | null>(null)

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="sm:max-w-[450px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Escolha o método de pagamento</DialogTitle>
          <DialogDescription>
            Trabalhamos com os melhores gateways para garantir sua segurança.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <button
            onClick={() => setSelecionado('stripe')}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              selecionado === 'stripe' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold">Cartão de Crédito (Stripe)</p>
              <p className="text-xs text-muted-foreground">Aceita bandeiras internacionais. Processamento instantâneo.</p>
            </div>
          </button>

          <button
            onClick={() => setSelecionado('asaas')}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              selecionado === 'asaas' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold">PIX ou Boleto (Asaas)</p>
              <p className="text-xs text-muted-foreground">Ideal para pagamentos nacionais. QR Code gerado na hora.</p>
            </div>
          </button>

          <button
            onClick={() => setSelecionado('pagarme')}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              selecionado === 'pagarme' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold">Cartão Nacional (Pagar.me)</p>
              <p className="text-xs text-muted-foreground">Processador brasileiro de alta performance.</p>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} className="rounded-full">Cancelar</Button>
          <Button 
            className="rounded-full bg-gradient-primary px-8" 
            disabled={!selecionado || carregando}
            onClick={() => selecionado && onConfirmar(selecionado)}
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Continuar para Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
