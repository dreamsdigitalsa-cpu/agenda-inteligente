import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Validar JWT e Permissões
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Sessão inválida')

    // Verificar se é admin/super_admin via RPC ou metadados
    const { data: hasPermission, error: roleError } = await supabaseAdmin.rpc('has_role', {
      user_id: user.id,
      role: 'admin'
    })
    
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('has_role', {
      user_id: user.id,
      role: 'super_admin'
    })

    if (!hasPermission && !isSuperAdmin) {
      throw new Error('Apenas administradores podem criar profissionais com login.')
    }

    const body = await req.json()
    const { nome, email, telefone, especialidade, comissao_tipo, comissao_valor, enviar_email = true } = body
    const tenantId = user.app_metadata.tenant_id

    if (!email || !nome) throw new Error('Nome e Email são obrigatórios.')
    
    console.log(`[criar-prof-login] Iniciando criação para ${email} no tenant ${tenantId}`)

    // 2. Validar Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) throw new Error('Email inválido.')

    // 3. Verificar existência
    const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === email)

    if (existingUser) {
      if (existingUser.app_metadata.tenant_id === tenantId) {
        throw new Error('Este email já está cadastrado neste estabelecimento.')
      } else {
        throw new Error('Este email já está em uso por outro estabelecimento/usuário.')
      }
    }

    let createdAuthUser = null
    let createdPublicUser = null
    let createdProfissional = null

    try {
      // 4. Criar no Auth
      const password = Math.random().toString(36).slice(-16)
      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
        app_metadata: { tenant_id: tenantId, perfil: 'profissional' }
      })

      if (createAuthError) throw createAuthError
      createdAuthUser = authData.user
      console.log('[criar-prof-login] Etapa 4: Auth user criado', createdAuthUser.id)

      // Buscar unidade_id principal do tenant
      const { data: unidade } = await supabaseAdmin
        .from('unidades')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1)
        .single()

      // 5. Criar no public.usuarios
      const { data: userData, error: createUserError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          auth_user_id: createdAuthUser.id,
          tenant_id: tenantId,
          unidade_id: unidade?.id,
          nome,
          email,
          ativo: true
        })
        .select()
        .single()

      if (createUserError) throw createUserError
      createdPublicUser = userData
      console.log('[criar-prof-login] Etapa 5: Registro em public.usuarios criado')

      // 6. Atribuir Role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: createdAuthUser.id,
          role: 'profissional'
        })

      if (roleInsertError) throw roleInsertError
      console.log('[criar-prof-login] Etapa 6: Role profissional atribuída')

      // 7. Criar no public.profissionais
      const { data: profData, error: createProfError } = await supabaseAdmin
        .from('profissionais')
        .insert({
          tenant_id: tenantId,
          nome,
          especialidade,
          telefone,
          usuario_id: createdPublicUser.id,
          comissao_tipo,
          comissao_valor
        })
        .select()
        .single()

      if (createProfError) throw createProfError
      createdProfissional = profData
      console.log('[criar-prof-login] Etapa 7: Registro em public.profissionais criado')

      // 8. Link de recuperação (Redefinir Senha)
      let linkDefinirSenha = null
      if (enviar_email) {
        const origin = req.headers.get('origin') || 'https://studioflow.com.br'
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${origin}/redefinir-senha` }
        })
        if (!linkError) linkDefinirSenha = linkData.properties.action_link
      }

      return new Response(
        JSON.stringify({
          profissional_id: createdProfissional.id,
          usuario_id: createdPublicUser.id,
          email,
          link_definir_senha: linkDefinirSenha
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } catch (innerError) {
      // ROLLBACK manual em caso de falha no fluxo
      console.error('[criar-prof-login] Erro no fluxo, iniciando rollback:', innerError.message)
      
      if (createdProfissional) await supabaseAdmin.from('profissionais').delete().eq('id', createdProfissional.id)
      if (createdPublicUser) await supabaseAdmin.from('usuarios').delete().eq('id', createdPublicUser.id)
      if (createdAuthUser) await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.id)
      
      throw innerError
    }

  } catch (error) {
    console.error('[criar-prof-login] Erro crítico:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
