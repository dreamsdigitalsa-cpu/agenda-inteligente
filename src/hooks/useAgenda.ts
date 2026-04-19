// Hook para consumo da agenda do dia.
// Não cacheia (ver POLITICA_CACHE.AGENDA_DO_DIA) — usar Supabase Realtime.
import { useState } from 'react'
import type { Agendamento } from '../tipos/agendamento'

export function useAgenda(_data: Date) {
  const [agendamentos] = useState<Agendamento[]>([])
  const [carregando] = useState(false)
  // TODO: assinar canal realtime do Supabase filtrando por tenant + data
  return { agendamentos, carregando }
}
