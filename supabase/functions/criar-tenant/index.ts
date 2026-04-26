// Edge Function: criar-tenant
// Cria, de forma atômica, o tenant + unidade principal + usuario + role 'admin'
// para um auth.user recém-criado no /cadastro.
//
// Fluxo:
// 1. Valida JWT do usuário (precisa ter feito signUp antes)
// 2. Cria tenant (plano freemium)
// 3. Cria unidade principal vinculada ao tenant
// 4. Cria registro em `usuarios` ligando auth_user_id ao tenant
// 5. Atribui role 'admin' em user_roles
// Em caso de falha em qualquer etapa, faz rollback manual dos registros criados.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  nomeEstabelecimento: string
  segmento: 'salao' | 'barbearia' | 'estetica' | 'tatuagem' | 'manicure'
  nomeAdmin: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supaAdmin = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('Authorization')
    const body = (await req.json()) as Payload
    
    let authUserId: string
    let email = ''

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: userData, error: userErr } = await supaAdmin.auth.getUser(token)
      
      if (userErr || !userData?.user) {
        console.error('[criar-tenant] token invalido:', JSON.stringify(userErr))
        return json({ erro: 'token_invalido' }, 401)
      }
      authUserId = userData.user.id
      email = userData.user.email ?? ''
      console.log('[criar-tenant] iniciado, authUserId:', authUserId, 'email:', email)
      console.log('[criar-tenant] payload:', JSON.stringify(body))
    } else {
      console.error('[criar-tenant] nao autenticado')
      return json({ erro: 'nao_autenticado' }, 401)
    }

    // 2) Valida restante do payload
    const segmentos = ['salao', 'barbearia', 'estetica', 'tatuagem', 'manicure']
    if (
      !body.nomeEstabelecimento?.trim() ||
      !body.nomeAdmin?.trim() ||
      !segmentos.includes(body.segmento)
    ) {
      console.error('[criar-tenant] payload invalido:', JSON.stringify(body))
      return json({ erro: 'payload_invalido' }, 400)
    }

    // 3) Verifica se o usuário JÁ tem tenant (idempotência)
    const { data: jaExiste } = await supaAdmin
      .from('usuarios')
      .select('tenant_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (jaExiste?.tenant_id) {
      console.log('[criar-tenant] usuario ja possui tenant:', jaExiste.tenant_id)
      return json({ tenantId: jaExiste.tenant_id, ja_existia: true })
    }

    console.log('[criar-tenant] inserindo tenant...')
    // 4) Cria tenant
    const { data: tenant, error: errTenant } = await supaAdmin
      .from('tenants')
      .insert({ nome: body.nomeEstabelecimento, segmento: body.segmento, plano: 'freemium' })
      .select('id')
      .single()
    
    if (errTenant) {
      console.error('[criar-tenant] erro tenant:', JSON.stringify(errTenant))
      throw new Error(`tenant: ${errTenant.message} (code: ${errTenant.code})`)
    }
    console.log('[criar-tenant] tenant criado:', tenant.id)

    console.log('[criar-tenant] inserindo unidade...')
    // 5) Cria unidade principal
    const { data: unidade, error: errUnidade } = await supaAdmin
      .from('unidades')
      .insert({ tenant_id: tenant.id, nome: 'Unidade principal' })
      .select('id')
      .single()
    
    if (errUnidade) {
      console.error('[criar-tenant] erro unidade:', JSON.stringify(errUnidade))
      await supaAdmin.from('tenants').delete().eq('id', tenant.id)
      throw new Error(`unidade: ${errUnidade.message} (code: ${errUnidade.code})`)
    }
    console.log('[criar-tenant] unidade criada:', unidade.id)

    console.log('[criar-tenant] inserindo usuario...')
    // 6) Cria registro em usuarios
    const { error: errUsuario } = await supaAdmin.from('usuarios').insert({
      auth_user_id: authUserId,
      tenant_id: tenant.id,
      unidade_id: unidade.id,
      nome: body.nomeAdmin,
      email,
    })
    
    if (errUsuario) {
      console.error('[criar-tenant] erro usuario:', JSON.stringify(errUsuario))
      await supaAdmin.from('tenants').delete().eq('id', tenant.id) // cascade unidades
      throw new Error(`usuario: ${errUsuario.message} (code: ${errUsuario.code})`)
    }
    console.log('[criar-tenant] usuario criado')

    console.log('[criar-tenant] inserindo role admin...')
    // 7) Atribui role 'admin'
    const { error: errRole } = await supaAdmin
      .from('user_roles')
      .insert({ user_id: authUserId, role: 'admin' })
    
    if (errRole) {
      console.error('[criar-tenant] erro role:', JSON.stringify(errRole))
      await supaAdmin.from('tenants').delete().eq('id', tenant.id)
      throw new Error(`role: ${errRole.message} (code: ${errRole.code})`)
    }
    console.log('[criar-tenant] role admin atribuida')

    return json({ tenantId: tenant.id })
  } catch (e) {
    console.error('[criar-tenant] erro fatal:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
