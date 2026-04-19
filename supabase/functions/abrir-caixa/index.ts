// Edge Function: abrir-caixa
// Abre uma sessão de caixa para uma unidade no dia corrente.
//
// Regras de negócio:
// - Apenas uma sessão pode estar 'aberto' por unidade por dia
// - Se já existe caixa aberto hoje, retorna erro 409 com os dados do caixa existente
// - Registra abertura no audit_log para rastreabilidade
//
// Segurança:
// - Requer JWT válido; tenant derivado do usuário autenticado
// - Escrita feita exclusivamente via service_role (bypassa RLS)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id: string
  unidade_id: string
  usuario_id: string   // ID do registro em public.usuarios (não o auth_user_id)
  saldo_inicial: number
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

    // Cliente com credenciais do usuário — apenas para validar o token
    const supaUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) return json({ erro: 'token_invalido' }, 401)
    const authUserId = claimsData.claims.sub as string

    // 2) Validar e parsear payload
    const body = (await req.json()) as Payload
    if (
      !body.tenant_id || !body.unidade_id || !body.usuario_id ||
      body.saldo_inicial == null || typeof body.saldo_inicial !== 'number'
    ) {
      return json({ erro: 'payload_invalido', campos_obrigatorios: ['tenant_id', 'unidade_id', 'usuario_id', 'saldo_inicial'] }, 400)
    }
    if (body.saldo_inicial < 0) {
      return json({ erro: 'saldo_inicial_invalido', detalhe: 'saldo_inicial não pode ser negativo' }, 400)
    }

    // 3) Verificar que o usuário autenticado pertence ao tenant informado
    const supaAdmin = createClient(supabaseUrl, serviceKey)
    const { data: usuarioDB, error: errUsuario } = await supaAdmin
      .from('usuarios')
      .select('id, tenant_id')
      .eq('auth_user_id', authUserId)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (errUsuario || !usuarioDB) {
      return json({ erro: 'acesso_negado', detalhe: 'usuário não pertence ao tenant informado' }, 403)
    }

    // 4) Verificar se já existe caixa aberto hoje para a unidade
    //    Intervalo em UTC para cobrir o dia completo independente do fuso do servidor
    const agora = new Date()
    const inicioDia = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
    const fimDia    = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1))

    const { data: caixaExistente } = await supaAdmin
      .from('caixa_sessoes')
      .select('id, abertura_em, saldo_inicial')
      .eq('tenant_id', body.tenant_id)
      .eq('unidade_id', body.unidade_id)
      .eq('status', 'aberto')
      .gte('abertura_em', inicioDia.toISOString())
      .lt('abertura_em', fimDia.toISOString())
      .maybeSingle()

    if (caixaExistente) {
      // Retorna 409 com os dados do caixa já existente para o front poder redirecionar
      return json({
        erro: 'caixa_ja_aberto',
        caixa_sessao_id: caixaExistente.id,
        abertura_em: caixaExistente.abertura_em,
        saldo_inicial: caixaExistente.saldo_inicial,
      }, 409)
    }

    // 5) Inserir nova sessão de caixa
    const aberturaEm = new Date().toISOString()
    const { data: novaCaixa, error: errCaixa } = await supaAdmin
      .from('caixa_sessoes')
      .insert({
        tenant_id:     body.tenant_id,
        unidade_id:    body.unidade_id,
        usuario_id:    body.usuario_id,
        saldo_inicial: body.saldo_inicial,
        abertura_em:   aberturaEm,
        status:        'aberto',
      })
      .select('id, status')
      .single()

    if (errCaixa) throw new Error(`caixa_sessoes insert: ${errCaixa.message}`)

    // 6) Registrar no audit_log
    await supaAdmin.from('audit_log').insert({
      tenant_id:   body.tenant_id,
      usuario_id:  body.usuario_id,
      acao:        'ABRIR_CAIXA',
      entidade:    'caixa_sessoes',
      entidade_id: novaCaixa.id,
      dados_novos: {
        unidade_id:    body.unidade_id,
        saldo_inicial: body.saldo_inicial,
        abertura_em:   aberturaEm,
        status:        'aberto',
      },
      ip: req.headers.get('x-forwarded-for') ?? null,
    })

    return json({ caixa_sessao_id: novaCaixa.id, status: 'aberto' })
  } catch (e) {
    console.error('[abrir-caixa] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
