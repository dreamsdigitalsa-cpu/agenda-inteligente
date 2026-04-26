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

    const body = await req.json()
    const event = body.event
    const payment = body.payment

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const customerId = payment.customer
      
      // Busca tenant pelo customer_id do Asaas
      const { data: assinatura } = await supabaseAdmin
        .from('assinaturas_tenant')
        .select('tenant_id')
        .eq('gateway_customer_id', customerId)
        .single()

      if (assinatura) {
        await supabaseAdmin
          .from('assinaturas_tenant')
          .update({
            status: 'ativa',
            ultimo_pagamento: new Date().toISOString()
          })
          .eq('tenant_id', assinatura.tenant_id)
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
