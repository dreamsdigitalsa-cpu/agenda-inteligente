-- ============================================================
-- Migração: Sistema de notificações automáticas
-- Tabelas: notificacoes_fila, configuracoes_notificacoes, integracoes_plataforma
-- ============================================================

-- ── Enumerados ───────────────────────────────────────────────────────────────
CREATE TYPE canal_notificacao  AS ENUM ('whatsapp', 'sms', 'email');
CREATE TYPE tipo_notificacao   AS ENUM ('lembrete_24h', 'lembrete_1h', 'confirmacao', 'cancelamento');
CREATE TYPE status_notificacao AS ENUM ('pendente', 'enviado', 'falhou', 'cancelado');

-- ── Fila de notificações ─────────────────────────────────────────────────────
-- Registro imutável de cada notificação agendada/enviada.
-- Apenas a Edge Function processar-notificacoes escreve nesta tabela.
CREATE TABLE notificacoes_fila (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id     UUID              REFERENCES clientes(id) ON DELETE SET NULL,
  agendamento_id UUID              REFERENCES agendamentos(id) ON DELETE CASCADE,
  canal          canal_notificacao NOT NULL,
  tipo           tipo_notificacao  NOT NULL,
  status         status_notificacao NOT NULL DEFAULT 'pendente',
  -- Incrementado a cada tentativa; bloqueado ao atingir 3
  tentativas     SMALLINT          NOT NULL DEFAULT 0,
  agendado_para  TIMESTAMPTZ       NOT NULL,
  enviado_em     TIMESTAMPTZ,
  erro           TEXT,
  criado_em      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Consulta rápida por tenant + status (tela de histórico)
CREATE INDEX idx_notificacoes_fila_tenant_status
  ON notificacoes_fila(tenant_id, status);

-- Idempotência: verificar se já existe entrada para o agendamento+tipo
CREATE INDEX idx_notificacoes_fila_agendamento_tipo
  ON notificacoes_fila(agendamento_id, tipo);

-- Índice parcial para o processador varrer apenas pendentes vencidos
CREATE INDEX idx_notificacoes_fila_pendentes
  ON notificacoes_fila(agendado_para)
  WHERE status = 'pendente';

-- ── Configurações de notificações por tenant ──────────────────────────────────
-- Uma linha por tenant; criada automaticamente na primeira vez que o admin salva.
CREATE TABLE configuracoes_notificacoes (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID    NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  lembrete_24h_ativo   BOOLEAN NOT NULL DEFAULT true,
  lembrete_1h_ativo    BOOLEAN NOT NULL DEFAULT true,
  canal_whatsapp_ativo BOOLEAN NOT NULL DEFAULT false,
  canal_email_ativo    BOOLEAN NOT NULL DEFAULT false,
  canal_sms_ativo      BOOLEAN NOT NULL DEFAULT false,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tocar_atualizado_em_config_notificacoes
  BEFORE UPDATE ON configuracoes_notificacoes
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();

-- ── Integrações com plataformas externas ─────────────────────────────────────
-- Armazena credenciais de WhatsApp (Z-API), SMS (Twilio) etc.
-- ATENÇÃO: cifrar credenciais sensíveis em nível de aplicação antes de gravar.
CREATE TABLE integracoes_plataforma (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Exemplos: 'zapi', 'twilio', 'sendgrid'
  plataforma    TEXT    NOT NULL,
  -- JSON com campos específicos de cada plataforma; nunca armazenar em texto plano
  credenciais   JSONB   NOT NULL DEFAULT '{}',
  ativo         BOOLEAN NOT NULL DEFAULT false,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, plataforma)
);

CREATE TRIGGER tocar_atualizado_em_integracoes_plataforma
  BEFORE UPDATE ON integracoes_plataforma
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE notificacoes_fila          ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes_plataforma     ENABLE ROW LEVEL SECURITY;

-- Histórico de notificações: qualquer usuário com acesso a relatórios pode ler
CREATE POLICY "notificacoes_fila_select" ON notificacoes_fila
  FOR SELECT TO authenticated
  USING (tem_permissao(auth.uid()::text, 'PERM-003'));

-- Configurações: leitura para todos do tenant, escrita apenas para admin (PERM-001)
CREATE POLICY "config_notificacoes_select" ON configuracoes_notificacoes
  FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_atual());

CREATE POLICY "config_notificacoes_insert" ON configuracoes_notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'));

CREATE POLICY "config_notificacoes_update" ON configuracoes_notificacoes
  FOR UPDATE TO authenticated
  USING     (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'))
  WITH CHECK (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'));

-- Integrações: somente admin pode ver e editar (contêm credenciais)
CREATE POLICY "integracoes_select" ON integracoes_plataforma
  FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'));

CREATE POLICY "integracoes_insert" ON integracoes_plataforma
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'));

CREATE POLICY "integracoes_update" ON integracoes_plataforma
  FOR UPDATE TO authenticated
  USING     (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'))
  WITH CHECK (tenant_id = get_tenant_atual() AND tem_permissao(auth.uid()::text, 'PERM-001'));

-- ── Cron job (executar após deploy da Edge Function) ─────────────────────────
-- Ative o pg_net no projeto Supabase e execute:
--
-- SELECT cron.schedule(
--   'processar-notificacoes',
--   '*/15 * * * *',
--   $$
--     SELECT net.http_post(
--       url     := 'https://SEU_PROJETO.supabase.co/functions/v1/processar-notificacoes',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'x-cron-secret', current_setting('app.cron_secret')
--       ),
--       body    := '{}'::jsonb
--     )
--   $$
-- );
--
-- Defina o segredo com:
-- ALTER DATABASE postgres SET app.cron_secret = 'SEU_SECRET_AQUI';
-- E configure a variável de ambiente CRON_SECRET na Edge Function com o mesmo valor.
