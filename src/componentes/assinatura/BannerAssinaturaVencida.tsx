'use client'

import { AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/hooks/useTenant'
import { useNavigate } from 'react-router-dom'

export function BannerAssinaturaVencida() {
  const { assinatura } = useTenant()
  const navigate = useNavigate()

  const statusBloqueantes = ['inadimplente', 'cancelada']
  if (!assinatura || !statusBloqueantes.includes(assinatura.status)) return null

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-4 text-sm font-medium animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Sua assinatura está {assinatura.status === 'cancelada' ? 'cancelada' : 'vencida'}. Renove agora para continuar usando o StudioFlow.</span>
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        className="h-8 rounded-full text-xs font-bold"
        onClick={() => navigate('/painel/assinatura')}
      >
        Regularizar Agora
        <ArrowRight className="ml-1.5 h-3 w-3" />
      </Button>
    </div>
  )
}
