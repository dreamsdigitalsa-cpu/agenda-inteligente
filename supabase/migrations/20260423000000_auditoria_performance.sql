-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Auditoria de Performance e Segurança
-- Data: 2026-04-23
-- Escopo:
--   1. Índices de performance adicionais (queries mais frequentes não cobertas)
--   2. Tabela de rate limiting para agendamento-publico (proteção contra abuso)
--   3. View audit_log_do_tenant (acesso filtrado por tenant para o painel)
--   4. Triggers de auditoria para DELETE sensíveis (cliente, profissional, serviço)
--   5. Trigger de auditoria para alterações em perfis de permissão
--   6. Constraint adicional de integridade cruzada em lancamentos
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. ÍNDICES ADICIONAIS DE PERFORMANCE ────────────────────────────────────

-- Queries de histórico de notificações filtradas por status + data (relatórios)
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_hora
  ON notificacoes_fila(tenant_id, agendado_para DESC)
  WHERE status IN ('pendente', 'falhou');

-- Histórico de ligações IA por tenant (página de histórico do tenant)
CREATE INDEX IF NOT EXISTS idx_ligacoes_ia_tenant_data
  ON ligacoes_ia(tenant_id, criado_em DESC);

-- Filtro por ação no audit_log (relatório de segurança do super admin)
CREATE INDEX IF NOT EXISTS idx_audit_log_acao
  ON audit_log(acao, criado_em DESC);

-- Agenda diária de um profissional — query mais frequente do painel
-- (tenant_id + status + data cobrindo cancelamentos/confirmados juntos)
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_status_data
  ON agendamentos(tenant_id, status, data_hora_inicio DESC);

-- Busca de agendamentos por cliente (histórico do cliente)
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_data
  ON agendamentos(cliente_id, data_hora_inicio DESC);

-- Lançamentos por forma de pagamento (relatório de fechamento de caixa)
CREATE INDEX IF NOT EXISTS idx_lancamentos_forma_pagamento
  ON lancamentos(caixa_sessao_id, forma_pagamento);

-- Sessões de caixa fechadas (consulta histórico, evita index full-scan no fechado)
CREATE INDEX IF NOT EXISTS idx_caixa_sessoes_fechados
  ON caixa_sessoes(tenant_id, fechamento_em DESC)
  WHERE status = 'fechado';

-- Tenants ativos com plano (query frequente do dashboard super-admin)
CREATE INDEX IF NOT EXISTS idx_tenants_status_plano
  ON tenants(status, plano_id)
  WHERE status = 'ativo';

-- Comissões pendentes por profissional (lista de aprovação)
CREATE INDEX IF NOT EXISTS idx_comissoes_pendentes
  ON comissoes(tenant_id, profissional_id, periodo_referencia DESC)
  WHERE status = 'pendente';

-- ── 2. TABELA DE RATE LIMITING ───────────────────────────────────────────────
-- Usada pela Edge Function agendamento-publico para limitar requisições por IP.
-- Janela de 1 hora: máximo 30 agendamentos/hora por IP por slug de tenant.
-- Limpeza automática via cron a cada 24h (comentado — ativar via Supabase Cron).

CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip           TEXT        NOT NULL,
  slug         TEXT        NOT NULL,
  -- Janela horária: truncado ao início da hora (ex: 2026-04-23 14:00:00+00)
  janela_hora  TIMESTAMPTZ NOT NULL,
  contagem     INTEGER     NOT NULL DEFAULT 1,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_unico UNIQUE (ip, slug, janela_hora)
);

-- Índice para limpeza eficiente de registros antigos
CREATE INDEX IF NOT EXISTS idx_rate_limit_janela
  ON rate_limit_requests(janela_hora);

-- Índice para lookup rápido durante a validação
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_slug
  ON rate_limit_requests(ip, slug, janela_hora DESC);

-- Função RPC para incrementar o contador de rate limit de forma atômica (upsert + increment).
-- Usada como fallback pela Edge Function quando o upsert direto não retorna a contagem atual.
CREATE OR REPLACE FUNCTION incrementar_rate_limit(
  p_ip     TEXT,
  p_slug   TEXT,
  p_janela TIMESTAMPTZ
)
RETURNS TABLE(contagem INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rate_limit_requests(ip, slug, janela_hora, contagem)
  VALUES (p_ip, p_slug, p_janela, 1)
  ON CONFLICT (ip, slug, janela_hora)
  DO UPDATE SET contagem = rate_limit_requests.contagem + 1;

  RETURN QUERY
  SELECT r.contagem FROM rate_limit_requests r
  WHERE r.ip = p_ip AND r.slug = p_slug AND r.janela_hora = p_janela;
END;
$$;

-- Função de limpeza chamada periodicamente para evitar crescimento indefinido da tabela
CREATE OR REPLACE FUNCTION limpar_rate_limit_antigos()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM rate_limit_requests
  WHERE janela_hora < now() - interval '24 hours';
$$;

-- NÃO habilitar RLS nesta tabela — é chamada exclusivamente via service_role
-- pelas Edge Functions. Acesso direto de usuários autenticados não é necessário.

-- ── 3. VIEW AUDIT_LOG_DO_TENANT ──────────────────────────────────────────────
-- Exposta para o painel do tenant (role admin + PERM-003).
-- Filtra automaticamente pelo tenant do usuário autenticado via get_tenant_atual().
-- Exclui colunas de infra interna (ip é exibido apenas para super admins).

CREATE OR REPLACE VIEW audit_log_do_tenant
  WITH (security_invoker = true)  -- respeita o contexto do chamador para RLS
AS
SELECT
  id,
  acao,
  entidade,
  entidade_id,
  dados_anteriores,
  dados_novos,
  usuario_id,
  criado_em
FROM audit_log
WHERE tenant_id = public.get_tenant_atual()
ORDER BY criado_em DESC;

COMMENT ON VIEW audit_log_do_tenant IS
  'Audit log filtrado pelo tenant do usuário logado. '
  'Usar apenas em contextos autenticados via JWT (get_tenant_atual() retorna NULL para anonimous).';

-- ── 4. TRIGGERS DE AUDITORIA PARA DELETE SENSÍVEIS ──────────────────────────
-- Registra exclusões de registros críticos antes que os dados sejam perdidos.
-- usuario_id é NULL quando a deleção ocorre via service_role (Edge Function).
-- A coluna `ip` não é capturável em triggers — fica NULL.

-- 4a. Deleção de clientes
CREATE OR REPLACE FUNCTION _trg_audit_delete_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log(
    tenant_id, usuario_id, acao, entidade, entidade_id, dados_anteriores
  ) VALUES (
    OLD.tenant_id,
    auth.uid(),           -- NULL se service_role
    'EXCLUIR_CLIENTE',
    'clientes',
    OLD.id::text,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_delete_cliente ON clientes;
CREATE TRIGGER trg_audit_delete_cliente
  BEFORE DELETE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION _trg_audit_delete_cliente();

-- 4b. Deleção de profissionais
CREATE OR REPLACE FUNCTION _trg_audit_delete_profissional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log(
    tenant_id, usuario_id, acao, entidade, entidade_id, dados_anteriores
  ) VALUES (
    OLD.tenant_id,
    auth.uid(),
    'EXCLUIR_PROFISSIONAL',
    'profissionais',
    OLD.id::text,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_delete_profissional ON profissionais;
CREATE TRIGGER trg_audit_delete_profissional
  BEFORE DELETE ON profissionais
  FOR EACH ROW
  EXECUTE FUNCTION _trg_audit_delete_profissional();

-- 4c. Deleção de serviços
CREATE OR REPLACE FUNCTION _trg_audit_delete_servico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log(
    tenant_id, usuario_id, acao, entidade, entidade_id, dados_anteriores
  ) VALUES (
    OLD.tenant_id,
    auth.uid(),
    'EXCLUIR_SERVICO',
    'servicos',
    OLD.id::text,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_delete_servico ON servicos;
CREATE TRIGGER trg_audit_delete_servico
  BEFORE DELETE ON servicos
  FOR EACH ROW
  EXECUTE FUNCTION _trg_audit_delete_servico();

-- 4d. Cancelamento de agendamentos (mudança de status para 'cancelado')
-- Registra como CANCELAR_AGENDAMENTO para diferenciar de outras atualizações.
CREATE OR REPLACE FUNCTION _trg_audit_cancelar_agendamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só dispara quando o status muda para 'cancelado'
  IF NEW.status = 'cancelado' AND OLD.status <> 'cancelado' THEN
    INSERT INTO audit_log(
      tenant_id, usuario_id, acao, entidade, entidade_id,
      dados_anteriores, dados_novos
    ) VALUES (
      OLD.tenant_id,
      auth.uid(),
      'CANCELAR_AGENDAMENTO',
      'agendamentos',
      OLD.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_cancelar_agendamento ON agendamentos;
CREATE TRIGGER trg_audit_cancelar_agendamento
  AFTER UPDATE OF status ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION _trg_audit_cancelar_agendamento();

-- ── 5. AUDITORIA DE ALTERAÇÕES EM PERFIS DE PERMISSÃO ───────────────────────
-- Toda alteração nas permissões de um perfil é registrada no audit_log.

CREATE OR REPLACE FUNCTION _trg_audit_permissao_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Busca o tenant_id do perfil afetado
  SELECT tenant_id INTO v_tenant_id
  FROM perfis_permissao
  WHERE id = COALESCE(NEW.perfil_id, OLD.perfil_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(tenant_id, usuario_id, acao, entidade, entidade_id, dados_novos)
    VALUES (v_tenant_id, auth.uid(), 'ADICIONAR_PERMISSAO', 'permissoes_do_perfil',
            NEW.perfil_id::text,
            jsonb_build_object('perfil_id', NEW.perfil_id, 'codigo', NEW.codigo_permissao));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(tenant_id, usuario_id, acao, entidade, entidade_id, dados_anteriores)
    VALUES (v_tenant_id, auth.uid(), 'REMOVER_PERMISSAO', 'permissoes_do_perfil',
            OLD.perfil_id::text,
            jsonb_build_object('perfil_id', OLD.perfil_id, 'codigo', OLD.codigo_permissao));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_permissao_perfil ON permissoes_do_perfil;
CREATE TRIGGER trg_audit_permissao_perfil
  AFTER INSERT OR DELETE ON permissoes_do_perfil
  FOR EACH ROW
  EXECUTE FUNCTION _trg_audit_permissao_perfil();

-- ── 6. CONSTRAINT DE INTEGRIDADE CRUZADA EM LANCAMENTOS ─────────────────────
-- Garante que o tenant_id do lançamento bate com o tenant_id da sessão de caixa.
-- A Edge Function registrar-lancamento já valida isso, mas o banco reforça.
-- Implementado como CHECK usando uma função para acessar a tabela relacionada.

CREATE OR REPLACE FUNCTION _validar_lancamento_tenant(
  p_caixa_sessao_id UUID,
  p_tenant_id       UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM caixa_sessoes
    WHERE id = p_caixa_sessao_id
      AND tenant_id = p_tenant_id
  );
$$;

-- Adicionar constraint somente se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'lancamentos'
      AND constraint_name = 'chk_lancamento_tenant_caixa'
  ) THEN
    ALTER TABLE lancamentos
      ADD CONSTRAINT chk_lancamento_tenant_caixa
      CHECK (_validar_lancamento_tenant(caixa_sessao_id, tenant_id));
  END IF;
END;
$$;

-- ── 7. VERIFICAÇÕES DE SEGURANÇA — DOCUMENTAÇÃO ─────────────────────────────
-- As verificações abaixo validam o estado atual das políticas RLS.
-- Execute manualmente para confirmar isolamento entre tenants.

/*
-- Teste 1: Tenant A não acessa dados do Tenant B
-- (executar como auth user do tenant A)
SELECT COUNT(*) FROM lancamentos;
-- Deve retornar apenas lançamentos do próprio tenant.

-- Teste 2: Trigger de imutabilidade em lancamentos
BEGIN;
UPDATE lancamentos SET valor = 999 WHERE id = (SELECT id FROM lancamentos LIMIT 1);
-- Deve falhar com: "lancamentos são imutáveis"
ROLLBACK;

-- Teste 3: Tentativa de SELECT de credenciais por usuário autenticado
SELECT * FROM configuracoes_sistema WHERE chave = 'ligacao_ia_credenciais';
-- Deve retornar vazio (RLS bloqueia credenciais para não-super_admin).

-- Teste 4: Verificar que rate_limit_requests não tem RLS (service_role only)
-- A tabela não expõe dados de usuários. Acesso direto via authenticated retorna 0 rows.
SET ROLE authenticated;
SELECT COUNT(*) FROM rate_limit_requests; -- deve retornar 0 (sem RLS, sem acesso)
RESET ROLE;
*/

COMMENT ON TABLE rate_limit_requests IS
  'Rate limiting para a Edge Function agendamento-publico. '
  'Limite: 30 tentativas/hora por IP por slug. '
  'Limpeza: executar limpar_rate_limit_antigos() diariamente via cron.';

COMMENT ON INDEX idx_notificacoes_tenant_hora IS
  'Otimiza query de notificações pendentes/falhas por tenant (relatório de histórico).';

COMMENT ON INDEX idx_agendamentos_tenant_status_data IS
  'Otimiza filtros combinados de status + data na agenda diária (query mais frequente).';
