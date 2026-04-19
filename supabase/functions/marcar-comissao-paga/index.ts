// Edge Function: marcar-comissao-paga
// Atualiza o status de uma comissão para 'paga' (ou reverte para 'pendente').
//
// Regras de negócio:
// - Requer PERM-004 (mesma permissão de fechar caixa — geralmente o admin/gerente)
// - A comissão deve pertencer ao tenant do usuário autenticado
// - Registra a mudança no audit_log
//
// Segurança:
// - Verifica PERM-004 via função tem_permissao() no banco (service_role)
// - Nunca aceita tenant_id sem validar contra o JWT
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id:   string
  comissao_id: string
  novo_status: 'paga' | 'pendente'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1) Validar autenticação via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ erro: 'nao_autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supaUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) return json({ erro: 'token_invalido' }, 401)
    const authUserId = claimsData.claims.sub as string

    // 2) Validar payload
    const body = (await req.json()) as Payload
    const statusValidos = ['paga', 'pendente']
    if (!body.tenant_id || !body.comissao_id || !statusValidos.includes(body.novo_status)) {
      return json({ erro: 'payload_invalido', campos: ['tenant_id', 'comissao_id', 'novo_status'] }, 400)
    }

    const supaAdmin = createClient(supabaseUrl, serviceKey)

    // 3) Verificar que o usuário pertence ao tenant
    const { data: usuarioDB } = await supaAdmin
      .from('usuarios')
      .select('id, tenant_id')
      .eq('auth_user_id', authUserId)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (!usuarioDB) {
      return json({ erro: 'acesso_negado', detalhe: 'usuário não pertence ao tenant' }, 403)
    }

    // 4) Verificar PERM-004 — mesmo quem fecha caixa pode marcar comissões pagas
    const { data: temPerm } = await supaAdmin.rpc('tem_permissao', {
      _user_id: authUserId,
      _codigo: 'PERM-004',
    })
    if (!temPerm) {
      return json({ erro: 'sem_permissao', codigo: 'PERM-004' }, 403)
    }

    // 5) Buscar comissão atual (para audit_log e validação)
    const { data: comissao, error: errComissao } = await supaAdmin
      .from('comissoes')
      .select('id, status, profissional_id, valor_calculado')
      .eq('id', body.comissao_id)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (errComissao || !comissao) {
      return json({ erro: 'comissao_nao_encontrada', comissao_id: body.comissao_id }, 404)
    }

    // Evitar atualização redundante
    if (comissao.status === body.novo_status) {
      return json({ comissao_id: body.comissao_id, status: comissao.status, sem_alteracao: true })
    }

    // 6) Atualizar status da comissão
    const { error: errUpdate } = await supaAdmin
      .from('comissoes')
      .update({ status: body.novo_status })
      .eq('id', body.comissao_id)

    if (errUpdate) throw new Error(`comissoes update: ${errUpdate.message}`)

    // 7) Registrar no audit_log
    await supaAdmin.from('audit_log').insert({
      tenant_id:        body.tenant_id,
      usuario_id:       usuarioDB.id,
      acao:             body.novo_status === 'paga' ? 'MARCAR_COMISSAO_PAGA' : 'REVERTER_COMISSAO',
      entidade:         'comissoes',
      entidade_id:      body.comissao_id,
      dados_anteriores: { status: comissao.status },
      dados_novos:      { status: body.novo_status },
      ip:               req.headers.get('x-forwarded-for') ?? null,
    })

    return json({ comissao_id: body.comissao_id, status: body.novo_status })
  } catch (e) {
    console.error('[marcar-comissao-paga] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
