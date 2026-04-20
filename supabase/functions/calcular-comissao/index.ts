// Edge Function: calcular-comissao
// Calcula e registra a comissão de um profissional a partir de um agendamento concluído.
//
// Regras de negócio:
// - Busca o agendamento para obter profissional e serviço
// - Busca o lançamento vinculado ao agendamento (criado por registrar-lancamento)
// - Lê a configuração de comissão do serviço (comissao_tipo + comissao_valor em servicos)
// - Calcula: percentual → (valor_lancamento * percentual / 100) | fixo → valor direto
// - Insere em comissoes com status 'pendente'
// - periodo_referencia = primeiro dia do mês corrente (para agrupamento em folha)
//
// Segurança:
// - Requer JWT válido; tenant validado contra o usuário autenticado
// - Escrita feita exclusivamente via service_role (bypassa RLS)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  tenant_id:      string
  agendamento_id: string
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
    const { data: userData, error: userErr } = await supaUser.auth.getUser(token)
    if (userErr || !userData?.user) return json({ erro: 'token_invalido' }, 401)
    const authUserId = userData.user.id

    // 2) Validar payload
    const body = (await req.json()) as Payload
    if (!body.tenant_id || !body.agendamento_id) {
      return json({ erro: 'payload_invalido', campos_obrigatorios: ['tenant_id', 'agendamento_id'] }, 400)
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
      return json({ erro: 'acesso_negado', detalhe: 'usuário não pertence ao tenant informado' }, 403)
    }

    // 4) Buscar agendamento com serviço e profissional
    const { data: agendamento, error: errAgendamento } = await supaAdmin
      .from('agendamentos')
      .select('id, tenant_id, profissional_id, servico_id, status')
      .eq('id', body.agendamento_id)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (errAgendamento || !agendamento) {
      return json({ erro: 'agendamento_nao_encontrado', agendamento_id: body.agendamento_id }, 404)
    }
    // Comissão só faz sentido para atendimentos concluídos
    if (agendamento.status !== 'concluido') {
      return json({ erro: 'agendamento_nao_concluido', status_atual: agendamento.status }, 422)
    }

    // 5) Buscar o lançamento vinculado ao agendamento
    //    O lançamento é criado por registrar-lancamento quando o agendamento é concluído
    const { data: lancamento, error: errLancamento } = await supaAdmin
      .from('lancamentos')
      .select('id, valor, tipo')
      .eq('agendamento_id', body.agendamento_id)
      .eq('tenant_id', body.tenant_id)
      .eq('tipo', 'receita')     // comissão se aplica apenas a receitas
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (errLancamento || !lancamento) {
      return json({ erro: 'lancamento_nao_encontrado', detalhe: 'nenhum lançamento de receita encontrado para este agendamento' }, 404)
    }

    // 6) Verificar se já existe comissão calculada para este lançamento (idempotência)
    const { data: comissaoExistente } = await supaAdmin
      .from('comissoes')
      .select('id, valor_calculado, status')
      .eq('lancamento_id', lancamento.id)
      .maybeSingle()

    if (comissaoExistente) {
      return json({
        erro: 'comissao_ja_calculada',
        comissao_id:     comissaoExistente.id,
        valor_calculado: comissaoExistente.valor_calculado,
        status:          comissaoExistente.status,
      }, 409)
    }

    // 7) Buscar configuração de comissão do serviço
    const { data: servico, error: errServico } = await supaAdmin
      .from('servicos')
      .select('id, nome, preco_centavos, comissao_tipo, comissao_valor')
      .eq('id', agendamento.servico_id)
      .eq('tenant_id', body.tenant_id)
      .maybeSingle()

    if (errServico || !servico) {
      return json({ erro: 'servico_nao_encontrado', servico_id: agendamento.servico_id }, 404)
    }
    if (!servico.comissao_tipo || servico.comissao_valor == null) {
      return json({ erro: 'comissao_nao_configurada', servico_id: servico.id, servico_nome: servico.nome }, 422)
    }

    // 8) Calcular valor da comissão
    const valorBase = Number(lancamento.valor)
    let valorCalculado: number

    if (servico.comissao_tipo === 'percentual') {
      // Comissão percentual sobre o valor do lançamento
      valorCalculado = Math.round((valorBase * Number(servico.comissao_valor) / 100) * 100) / 100
    } else {
      // Comissão fixa independente do valor
      valorCalculado = Number(servico.comissao_valor)
    }

    if (valorCalculado <= 0) {
      return json({ erro: 'valor_comissao_invalido', valor_calculado: valorCalculado }, 422)
    }

    // 9) periodo_referencia = primeiro dia do mês corrente
    const agora = new Date()
    const periodoReferencia = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}-01`

    // 10) Inserir comissão
    const { data: novaComissao, error: errComissao } = await supaAdmin
      .from('comissoes')
      .insert({
        tenant_id:         body.tenant_id,
        profissional_id:   agendamento.profissional_id,
        lancamento_id:     lancamento.id,
        tipo:              servico.comissao_tipo,
        valor_base:        valorBase,
        percentual:        servico.comissao_tipo === 'percentual' ? Number(servico.comissao_valor) : null,
        valor_calculado:   valorCalculado,
        status:            'pendente',
        periodo_referencia: periodoReferencia,
      })
      .select('id')
      .single()

    if (errComissao) throw new Error(`comissoes insert: ${errComissao.message}`)

    // 11) Registrar no audit_log
    await supaAdmin.from('audit_log').insert({
      tenant_id:   body.tenant_id,
      usuario_id:  usuarioDB.id,
      acao:        'CALCULAR_COMISSAO',
      entidade:    'comissoes',
      entidade_id: novaComissao.id,
      dados_novos: {
        profissional_id:    agendamento.profissional_id,
        agendamento_id:     body.agendamento_id,
        lancamento_id:      lancamento.id,
        servico_id:         servico.id,
        tipo:               servico.comissao_tipo,
        valor_base:         valorBase,
        percentual:         servico.comissao_tipo === 'percentual' ? servico.comissao_valor : null,
        valor_calculado:    valorCalculado,
        periodo_referencia: periodoReferencia,
      },
      ip: req.headers.get('x-forwarded-for') ?? null,
    })

    return json({ comissao_id: novaComissao.id, valor_calculado: valorCalculado })
  } catch (e) {
    console.error('[calcular-comissao] erro:', e)
    return json({ erro: 'falha_interna', detalhe: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
