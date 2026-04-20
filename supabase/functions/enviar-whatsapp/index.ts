// Edge Function: enviar-whatsapp
// Envia uma mensagem via Z-API (canal WhatsApp).
//
// Regras de negócio:
// - Busca as credenciais Z-API em integracoes_plataforma para o tenant informado.
// - Formata o telefone removendo não-dígitos.
// - Chama a API do Z-API e retorna { sucesso, message_id }.
//
// Segurança:
// - Aceita JWT de usuário autenticado (chamada manual/teste) ou
//   o SUPABASE_SERVICE_ROLE_KEY (chamada interna de processar-notificacoes).
// - Nunca expõe as credenciais da integração na resposta.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id: string
  telefone:  string
  mensagem:  string
  tipo:      string
}

interface CredenciaisZApi {
  instance_id:   string
  token:         string
  client_token?: string  // Token adicional exigido pelo plano Z-API
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ erro: 'nao_autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const token      = authHeader.replace('Bearer ', '')
    const isInternal = token === serviceKey

    // Validar payload
    const body = (await req.json()) as Payload
    if (!body.tenant_id || !body.telefone || !body.mensagem) {
      return json({ erro: 'payload_invalido', campos_obrigatorios: ['tenant_id', 'telefone', 'mensagem'] }, 400)
    }

    const supaAdmin = createClient(supabaseUrl, serviceKey)

    // Verificar que o usuário pertence ao tenant quando chamado por um usuário externo
    if (!isInternal) {
      const supaUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token)
      if (claimsErr || !claimsData?.claims) return json({ erro: 'token_invalido' }, 401)

      const authUserId = claimsData.claims.sub as string
      const { data: usuarioDB } = await supaAdmin
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', authUserId)
        .eq('tenant_id', body.tenant_id)
        .maybeSingle()

      if (!usuarioDB) return json({ erro: 'acesso_negado' }, 403)
    }

    // Buscar credenciais Z-API do tenant
    const { data: integracao } = (await supaAdmin
      .from('integracoes_plataforma' as never)
      .select('credenciais, ativo')
      .eq('tenant_id', body.tenant_id)
      .eq('plataforma', 'zapi')
      .maybeSingle()) as unknown as {
        data: { credenciais: CredenciaisZApi; ativo: boolean } | null
      }

    if (!integracao) {
      return json({ erro: 'integracao_zapi_nao_encontrada' }, 404)
    }
    if (!integracao.ativo) {
      return json({ erro: 'integracao_zapi_inativa' }, 422)
    }

    const creds = integracao.credenciais
    if (!creds?.instance_id || !creds?.token) {
      return json({ erro: 'credenciais_zapi_incompletas' }, 422)
    }

    // Formatar telefone: apenas dígitos, sem espaços ou separadores
    const telefoneFormatado = body.telefone.replace(/\D/g, '')
    if (telefoneFormatado.length < 10) {
      return json({ erro: 'telefone_invalido', telefone: body.telefone }, 422)
    }

    // Chamar Z-API
    const zapiUrl = `https://api.z-api.io/instances/${creds.instance_id}/token/${creds.token}/send-messages`

    const zapiRes = await fetch(zapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Client-Token é obrigatório em alguns planos Z-API
        ...(creds.client_token ? { 'Client-Token': creds.client_token } : {}),
      },
      body: JSON.stringify({
        phone:   telefoneFormatado,
        message: body.mensagem,
      }),
    })

    const zapiData = await zapiRes.json() as Record<string, unknown>

    if (!zapiRes.ok) {
      const erroMsg = (zapiData.message ?? zapiData.error ?? `Z-API HTTP ${zapiRes.status}`) as string
      console.error('[enviar-whatsapp] Z-API erro:', erroMsg, 'tenant:', body.tenant_id)
      return json({ sucesso: false, erro: erroMsg }, 502)
    }

    // Retornar o ID da mensagem gerado pelo Z-API (campo varia conforme versão)
    const messageId = (zapiData.zaapId ?? zapiData.id ?? zapiData.messageId ?? null) as string | null

    return json({ sucesso: true, message_id: messageId })
  } catch (e) {
    console.error('[enviar-whatsapp] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
