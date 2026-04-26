import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado')

    // 1. Busca assinatura ativa do tenant do usuário
    const { data: usuario, error: errU } = await supabaseClient
      .from('usuarios')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (errU || !usuario) throw new Error('Usuário não encontrado')

    const { data: assinatura, error: errA } = await supabaseClient
      .from('assinaturas_tenant')
      .select('*')
      .eq('tenant_id', usuario.tenant_id)
      .single()
    
    if (errA || !assinatura) throw new Error('Assinatura não encontrada')

    // 2. Lógica de cancelamento no gateway
    // Ex: if (assinatura.gateway === 'stripe') { ... }

    // 3. Atualiza status local
    const { error: errUp } = await supabaseClient
      .from('assinaturas_tenant')
      .update({ 
        status: 'cancelada',
        atualizado_em: new Date().toISOString()
      })
      .eq('id', assinatura.id)

    if (errUp) throw errUp

    return new Response(
      JSON.stringify({ message: 'Assinatura cancelada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
