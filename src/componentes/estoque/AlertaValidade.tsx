'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/cliente'
import { useTenant } from '@/hooks/useTenant'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AlertaValidade() {
  const { tenant } = useTenant()

  const { data: lotesVencendo } = useQuery({
    queryKey: ['lotes-vencendo', tenant?.id],
    queryFn: async () => {
      const dataLimite = addDays(new Date(), 30).toISOString()
      
      const { data, error } = await supabase
        .from('lotes_estoque')
        .select('*, produtos(nome)')
        .lte('data_validade', dataLimite)
        .gte('data_validade', new Date().toISOString().split('T')[0])
        .gt('quantidade', 0)
        .order('data_validade')
        .limit(3)

      if (error) throw error
      return data
    },
    enabled: !!tenant?.id
  })

  if (!lotesVencendo || lotesVencendo.length === 0) return null

  return (
    <div className="grid gap-3">
      {lotesVencendo.map(lote => (
        <Alert key={lote.id} variant="destructive" className="border-amber-500 bg-amber-500/10 text-amber-700 rounded-2xl">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-bold">Atenção: Produto Próximo ao Vencimento</AlertTitle>
          <AlertDescription>
            O lote do produto <strong>{lote.produtos?.nome}</strong> vence em {format(new Date(lote.data_validade), 'dd/MM/yyyy', { locale: ptBR })}.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
