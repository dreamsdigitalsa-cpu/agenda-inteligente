// Cliente Supabase para uso no frontend
// Não usar para operações financeiras — use Edge Functions
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseChavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseChavePublica)
