// Cliente Supabase do frontend.
// Aceita tanto VITE_SUPABASE_PUBLISHABLE_KEY (padrão atual da Lovable Cloud)
// quanto VITE_SUPABASE_ANON_KEY (compatibilidade retroativa).
// Falha de configuração lança erro explícito em vez de virar tela branca silenciosa.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Mensagem clara aparece no console e é capturada pelo ErrorBoundary,
  // evitando o sintoma de "tela branca" sem causa aparente.
  throw new Error(
    'Configuração Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});