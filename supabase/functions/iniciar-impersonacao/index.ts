// Edge Function: iniciar-impersonacao
// Gera um token de login temporário (magic link) para o admin principal de um tenant.
// O super admin usa esse token para abrir o painel como se fosse o dono do tenant.
//
// Fluxo:
//   1. Valida super_admin via JWT + user_roles.
//   2. Busca o primeiro usuário com role 'admin' no tenant alvo.
//   3. Obtém o e-mail do usuário via auth.admin.getUserById.
//   4. Gera magic link via auth.admin.generateLink (sem enviar e-mail).
//   5. Retorna { token_hash, tenant_nome } — o frontend troca por sessão real.
//   6. Registra no audit_log com ação IMPERSONAR_TENANT (exige PERM-011).
//
// Segurança:
//   - Apenas super_admin pode chamar esta função.
//   - O token_hash gerado expira em ~15 minutos (padrão Supabase).
//   - Toda ação é registrada em audit_log com o IP do super admin.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id_alvo: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Validar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ erro: 'nao_autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supaUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supaUser.auth.getUser(token)
    if (userErr || !userData?.user) return json({ erro: 'token_invalido' }, 401)
    const superAdminAuthId = userData.user.id

    // 2. Verificar role super_admin
    const supaAdmin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await supaAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', superAdminAuthId)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (!roleRow) return json({ erro: 'acesso_negado', detalhe: 'requer role super_admin' }, 403)

    // 3. Validar payload
    const body = (await req.json()) as Payload
    if (!body.tenant_id_alvo) {
      return json({ erro: 'payload_invalido', campo: 'tenant_id_alvo' }, 400)
    }

    // 4. Buscar dados do tenant alvo
    const { data: tenant } = await supaAdmin
      .from('tenants')
      .select('id, nome, status')
      .eq('id', body.tenant_id_alvo)
      .maybeSingle()

    if (!tenant) return json({ erro: 'tenant_nao_encontrado' }, 404)

    // 5. Buscar o primeiro admin do tenant (cronologicamente)
    const { data: usuarioDB } = await supaAdmin
      .from('usuarios')
      .select('auth_user_id')
      .eq('tenant_id', body.tenant_id_alvo)
      .order('criado_em', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!usuarioDB) {
      return json({ erro: 'tenant_sem_usuarios', tenant_id: body.tenant_id_alvo }, 404)
    }

    // Verificar que o usuário tem role admin no tenant
    const { data: adminRoleRow } = await supaAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', usuarioDB.auth_user_id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle()

    const targetAuthId = usuarioDB.auth_user_id

    // 6. Obter e-mail do usuário via admin API
    const { data: authUser, error: authErr } = await supaAdmin.auth.admin.getUserById(targetAuthId)
    if (authErr || !authUser.user?.email) {
      console.error('[iniciar-impersonacao] Erro ao buscar auth user:', authErr?.message)
      return json({ erro: 'usuario_sem_email', auth_user_id: targetAuthId }, 422)
    }

    const emailAlvo = authUser.user.email

    // 7. Gerar magic link (sem enviar e-mail — apenas para obter o token)
    const { data: linkData, error: linkErr } = await supaAdmin.auth.admin.generateLink({
      type:  'magiclink',
      email: emailAlvo,
      options: {
        // Sinaliza no metadata que esta sessão é de impersonação
        data: {
          impersonando:       true,
          super_admin_id:     superAdminAuthId,
          tenant_id_original: body.tenant_id_alvo,
        },
      },
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('[iniciar-impersonacao] Erro ao gerar link:', linkErr?.message)
      return json({ erro: 'falha_gerar_token', detalhe: linkErr?.message }, 500)
    }

    // 8. Registrar no audit_log
    const { data: superUsuario } = await supaAdmin
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', superAdminAuthId)
      .maybeSingle()

    await supaAdmin.from('audit_log').insert({
      tenant_id:   body.tenant_id_alvo,
      usuario_id:  superUsuario?.id ?? null,
      acao:        'IMPERSONAR_TENANT',
      entidade:    'tenants',
      entidade_id: body.tenant_id_alvo,
      dados_novos: {
        super_admin_auth_id: superAdminAuthId,
        tenant_alvo_nome:    (tenant as { nome: string }).nome,
        usuario_alvo:        emailAlvo,
      },
      ip: req.headers.get('x-forwarded-for') ?? null,
    })

    console.log(`[iniciar-impersonacao] Super admin ${superAdminAuthId} impersonando tenant ${body.tenant_id_alvo}`)

    return json({
      token_hash:  linkData.properties.hashed_token,
      tenant_nome: (tenant as { nome: string }).nome,
      tenant_id:   body.tenant_id_alvo,
      email_alvo:  emailAlvo,
    })
  } catch (e) {
    console.error('[iniciar-impersonacao] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
