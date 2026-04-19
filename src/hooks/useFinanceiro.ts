// Hook para dados financeiros.
// Regra: NUNCA cachear (ver POLITICA_CACHE.DADOS_FINANCEIROS).
// Sempre buscar do servidor via Edge Function.
import { useState } from 'react'
import type { MovimentoFinanceiro } from '../tipos/financeiro'

export function useFinanceiro() {
  const [movimentos] = useState<MovimentoFinanceiro[]>([])
  const [carregando] = useState(false)
  // TODO: chamar Edge Function autenticada para listar movimentos
  return { movimentos, carregando }
}
