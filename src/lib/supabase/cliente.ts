// Re-export do cliente Supabase tipado.
// Mantém compatibilidade com imports existentes em '@/lib/supabase/cliente'.
// O cliente real fica em '@/integrations/supabase/client' (gerado).
export { supabase } from '@/integrations/supabase/client'
