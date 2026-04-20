// Edge Function: salvar-credenciais-sistema
// Criptografa credenciais sensíveis com AES-256-GCM antes de gravar em configuracoes_sistema.
// NUNCA retorna credenciais em texto plano — apenas confirma o salvamento.
//
// Input:  { chave: string, credenciais: object }
// Output: { ok: true, chave: string }
//
// Segurança:
//   - Apenas super_admin pode chamar.
//   - A chave CRYPT_SECRET deve ser configurada como variável de ambiente na Edge Function.
//   - O valor armazenado é { _encrypted: true, ciphertext: "base64" }.
//   - Outras Edge Functions usam descriptografarSeNecessario() do _shared/crypto.ts.
//
// Variável de ambiente obrigatória: CRYPT_SECRET (min. 32 caracteres)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'
import { criptografar } from '../_shared/crypto.ts'

interface Payload {
  chave:       string
  credenciais: Record<string, unknown>
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
    const cryptSecret = Deno.env.get('CRYPT_SECRET')

    if (!cryptSecret || cryptSecret.length < 16) {
      console.error('[salvar-credenciais-sistema] CRYPT_SECRET não configurada ou muito curta')
      return json({ erro: 'crypt_secret_nao_configurada' }, 500)
    }

    const supaUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) return json({ erro: 'token_invalido' }, 401)
    const authUserId = claimsData.claims.sub as string

    // 2. Verificar role super_admin
    const supaAdmin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await supaAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authUserId)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (!roleRow) return json({ erro: 'acesso_negado' }, 403)

    // 3. Validar payload
    const body = (await req.json()) as Payload
    if (!body.chave || !body.credenciais || typeof body.credenciais !== 'object') {
      return json({ erro: 'payload_invalido', campos: ['chave', 'credenciais'] }, 400)
    }

    // Somente chaves que terminam em '_credenciais' ou '_creds' são aceitas por esta função
    // — chaves de configuração sem dados sensíveis devem ser salvas diretamente via supabase client
    const chavesPermitidas = [
      'whatsapp_credenciais',
      'sms_credenciais',
      'email_credenciais',
      'ligacao_ia_credenciais',
      'pagamento_credenciais',
    ]
    if (!chavesPermitidas.includes(body.chave)) {
      return json({
        erro:     'chave_nao_permitida',
        chave:    body.chave,
        permitidas: chavesPermitidas,
      }, 400)
    }

    // 4. Criptografar as credenciais
    const envelope = await criptografar(body.credenciais, cryptSecret)

    // 5. Gravar no banco (UPSERT)
    const { error: upsertErr } = await supaAdmin
      .from('configuracoes_sistema' as never)
      .upsert({ chave: body.chave, valor: envelope }, { onConflict: 'chave' })

    if (upsertErr) throw new Error(`upsert configuracoes_sistema: ${upsertErr.message}`)

    // 6. Registrar no audit_log (sem incluir as credenciais!)
    await supaAdmin.from('audit_log').insert({
      tenant_id:   null,
      usuario_id:  null,
      acao:        'SALVAR_CREDENCIAIS_SISTEMA',
      entidade:    'configuracoes_sistema',
      entidade_id: body.chave,
      dados_novos: { chave: body.chave, criptografado: true },
      ip:          req.headers.get('x-forwarded-for') ?? null,
    })

    console.log(`[salvar-credenciais-sistema] Credenciais '${body.chave}' salvas por ${authUserId}`)

    return json({ ok: true, chave: body.chave })
  } catch (e) {
    console.error('[salvar-credenciais-sistema] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
