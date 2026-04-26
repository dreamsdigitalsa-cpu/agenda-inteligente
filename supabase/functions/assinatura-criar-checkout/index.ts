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

    const { plano_id, gateway } = await req.json()
    if (!plano_id || !gateway) throw new Error('Dados insuficientes')

    // 1. Busca perfil do usuário
    const { data: usuario, error: errU } = await supabaseClient
      .from('usuarios')
      .select('tenant_id, email, nome')
      .eq('auth_user_id', user.id)
      .single()
    
    if (errU || !usuario) throw new Error('Usuário não vinculado a um tenant')

    // 2. Busca o plano
    const { data: plano, error: errP } = await supabaseClient
      .from('planos')
      .select('*')
      .eq('id', plano_id)
      .single()
    
    if (errP || !plano) throw new Error('Plano não encontrado')

    // 3. Busca credenciais do gateway (Mockado por enquanto para demonstrar o fluxo)
    // No mundo real, aqui você usaria as chaves de API do Stripe/Asaas/Pagarme
    
    let responseData = {}

    if (gateway === 'stripe') {
      // Mock de Stripe Checkout
      responseData = {
        url: 'https://checkout.stripe.com/pay/mock_session_id',
        message: 'Redirecionando para Stripe...'
      }
    } else if (gateway === 'asaas') {
      // Mock de Asaas
      responseData = {
        url: 'https://asaas.com/c/mock_payment_link',
        message: 'Link de pagamento Asaas gerado.'
      }
    } else {
      // Mock de Pagar.me
      responseData = {
        message: 'Iniciando processamento Pagar.me...',
        client_key: 'mock_pk_12345'
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
