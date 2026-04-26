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

    const { slug, nome, telefone, servico_id } = await req.json()
    if (!slug || !nome || !telefone) throw new Error('Dados insuficientes')

    // 1. Busca Tenant pelo Slug
    const { data: tenant, error: errT } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()
    
    if (errT || !tenant) throw new Error('Estabelecimento não encontrado')

    // 2. Busca ou Cria Cliente
    // Simplificado: Busca por telefone no tenant
    const { data: clienteExistente } = await supabaseAdmin
      .from('clientes')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('telefone', telefone)
      .maybeSingle()
    
    let clienteId = clienteExistente?.id
    if (!clienteId) {
      const { data: novoCliente, error: errC } = await supabaseAdmin
        .from('clientes')
        .insert({
          tenant_id: tenant.id,
          nome,
          telefone,
          tem_conta: false
        })
        .select('id')
        .single()
      if (errC) throw errC
      clienteId = novoCliente.id
    }

    // 3. Calcula Próxima Posição
    const { count } = await supabaseAdmin
      .from('fila_espera')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'aguardando')

    const proximaPosicao = (count || 0) + 1

    // 4. Insere na Fila
    const { data: registro, error: errF } = await supabaseAdmin
      .from('fila_espera')
      .insert({
        tenant_id: tenant.id,
        cliente_id: clienteId,
        cliente_nome: nome,
        cliente_telefone: telefone,
        servico_id: servico_id || null,
        posicao: proximaPosicao,
        status: 'aguardando'
      })
      .select('id')
      .single()

    if (errF) throw errF

    return new Response(
      JSON.stringify({ 
        id: registro.id,
        posicao: proximaPosicao,
        message: 'Você entrou na fila com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
