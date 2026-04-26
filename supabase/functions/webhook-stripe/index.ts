import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validar assinatura do Stripe (Omitido para o exemplo funcional, mas essencial em produção)
    const body = await req.json()
    const event = body.type
    const data = body.data.object

    if (event === 'checkout.session.completed') {
      const tenantId = data.client_reference_id
      const customerId = data.customer
      const subscriptionId = data.subscription

      // Atualiza assinatura no banco
      await supabaseAdmin
        .from('assinaturas_tenant')
        .update({
          status: 'ativa',
          gateway_customer_id: customerId,
          gateway_subscription_id: subscriptionId,
          ultimo_pagamento: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
