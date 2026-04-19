// Cliente Supabase para uso em contexto privilegiado (Edge Functions)
// IMPORTANTE: nunca importar este arquivo no frontend.
// A SERVICE_ROLE_KEY só deve viver em ambiente de servidor / Edge Functions.
import { createClient } from '@supabase/supabase-js'

export function criarClienteServidor(url: string, chaveServico: string) {
  return createClient(url, chaveServico, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
