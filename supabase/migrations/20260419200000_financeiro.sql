-- =============================================================
-- Módulo Financeiro: caixa_sessoes, lancamentos, comissoes, audit_log
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.status_caixa AS ENUM ('aberto', 'fechado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_lancamento AS ENUM ('receita', 'despesa');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.forma_pagamento AS ENUM (
    'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_comissao AS ENUM ('percentual', 'fixo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_comissao AS ENUM ('pendente', 'aprovada', 'paga', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------
-- 2. caixa_sessoes
--    Representa a abertura/fechamento do caixa de uma unidade por dia.
--    Apenas uma sessão pode estar 'aberto' por unidade por dia.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unidade_id    uuid          NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  usuario_id    uuid          NOT NULL, -- FK lógica para public.usuarios(id)
  abertura_em   timestamptz   NOT NULL DEFAULT now(),
  fechamento_em timestamptz,
  saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
  saldo_final   numeric(12,2),
  diferenca     numeric(12,2),             -- saldo_final_contado − saldo_esperado
  status        public.status_caixa NOT NULL DEFAULT 'aberto',
  criado_em     timestamptz   NOT NULL DEFAULT now(),
  atualizado_em timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caixa_sessoes_tenant
  ON public.caixa_sessoes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_caixa_sessoes_unidade_data
  ON public.caixa_sessoes (unidade_id, abertura_em DESC);
CREATE INDEX IF NOT EXISTS idx_caixa_sessoes_abertos
  ON public.caixa_sessoes (tenant_id, status) WHERE status = 'aberto';

ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;

-- Trigger para manter atualizado_em
DROP TRIGGER IF EXISTS trg_caixa_sessoes_atualizado_em ON public.caixa_sessoes;
CREATE TRIGGER trg_caixa_sessoes_atualizado_em
  BEFORE UPDATE ON public.caixa_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- ---------------------------------------------------------------
-- 3. lancamentos
--    Registros financeiros imutáveis — NUNCA são alterados ou removidos.
--    Qualquer estorno é feito via novo lançamento de valor negativo.
--    Ausência intencional de updated_at.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lancamentos (
  id                    uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid                    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unidade_id            uuid                    REFERENCES public.unidades(id),
  caixa_sessao_id       uuid                    NOT NULL REFERENCES public.caixa_sessoes(id),
  tipo                  public.tipo_lancamento  NOT NULL,
  categoria             text                    NOT NULL,
  descricao             text,
  valor                 numeric(12,2)           NOT NULL CONSTRAINT lancamentos_valor_positivo CHECK (valor > 0),
  forma_pagamento       public.forma_pagamento  NOT NULL,
  agendamento_id        uuid                    REFERENCES public.agendamentos(id),
  criado_por_usuario_id uuid,                  -- FK lógica para public.usuarios(id)
  criado_em             timestamptz             NOT NULL DEFAULT now()
  -- Sem updated_at: lançamentos são imutáveis por design de auditoria financeira
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_sessao
  ON public.lancamentos (caixa_sessao_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tenant_data
  ON public.lancamentos (tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_agendamento
  ON public.lancamentos (agendamento_id) WHERE agendamento_id IS NOT NULL;

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- Trigger que IMPEDE qualquer UPDATE em lancamentos (imutabilidade garantida no banco)
CREATE OR REPLACE FUNCTION public.bloquear_update_lancamentos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'lancamentos são imutáveis — crie um novo registro de estorno';
END;
$$;

DROP TRIGGER IF EXISTS trg_lancamentos_imutavel ON public.lancamentos;
CREATE TRIGGER trg_lancamentos_imutavel
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_update_lancamentos();

-- ---------------------------------------------------------------
-- 4. comissoes
--    Comissão calculada por lançamento/atendimento para um profissional.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.comissoes (
  id               uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid                   NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id  uuid                   NOT NULL REFERENCES public.profissionais(id),
  lancamento_id    uuid                   REFERENCES public.lancamentos(id),
  tipo             public.tipo_comissao   NOT NULL,
  valor_base       numeric(12,2)          NOT NULL, -- valor do serviço que originou a comissão
  percentual       numeric(5,2),                    -- preenchido quando tipo = 'percentual'
  valor_calculado  numeric(12,2)          NOT NULL,
  status           public.status_comissao NOT NULL DEFAULT 'pendente',
  periodo_referencia date,                          -- mês de referência para folha de pagamento
  criado_em        timestamptz            NOT NULL DEFAULT now(),
  atualizado_em    timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_profissional
  ON public.comissoes (profissional_id, periodo_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_comissoes_tenant
  ON public.comissoes (tenant_id, periodo_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_comissoes_lancamento
  ON public.comissoes (lancamento_id) WHERE lancamento_id IS NOT NULL;

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_comissoes_atualizado_em ON public.comissoes;
CREATE TRIGGER trg_comissoes_atualizado_em
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- ---------------------------------------------------------------
-- 5. audit_log
--    Trilha de auditoria imutável. Sem updated_at por design.
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid,
  usuario_id       uuid,
  acao             text        NOT NULL, -- ex: 'ABRIR_CAIXA', 'REGISTRAR_LANCAMENTO'
  entidade         text        NOT NULL, -- nome da tabela afetada
  entidade_id      uuid,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  ip               text,
  criado_em        timestamptz NOT NULL DEFAULT now()
  -- Sem updated_at: registros de auditoria são imutáveis
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_data
  ON public.audit_log (tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidade
  ON public.audit_log (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario
  ON public.audit_log (usuario_id, criado_em DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 6. Configuração de comissão nos serviços
--    Adiciona tipo e valor de comissão diretamente em servicos.
-- ---------------------------------------------------------------

ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS comissao_tipo  public.tipo_comissao,
  ADD COLUMN IF NOT EXISTS comissao_valor numeric(12,2);

-- ---------------------------------------------------------------
-- 7. RLS — caixa_sessoes
--    SELECT: usuários do tenant com PERM-003 ou super_admin
--    INSERT/UPDATE/DELETE: apenas service_role (Edge Functions)
--    → Nenhuma policy authenticated para escrita = bloqueado por padrão
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS caixa_sessoes_select ON public.caixa_sessoes;
CREATE POLICY caixa_sessoes_select ON public.caixa_sessoes
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (
      public.tem_permissao(auth.uid(), 'PERM-003')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ---------------------------------------------------------------
-- 8. RLS — lancamentos
--    SELECT: usuários do tenant com PERM-003 ou super_admin
--    INSERT/UPDATE/DELETE: apenas service_role
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS lancamentos_select ON public.lancamentos;
CREATE POLICY lancamentos_select ON public.lancamentos
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (
      public.tem_permissao(auth.uid(), 'PERM-003')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- ---------------------------------------------------------------
-- 9. RLS — comissoes
--    SELECT: admin/super_admin vê todas do tenant;
--            profissional vê apenas as próprias
--    INSERT/UPDATE/DELETE: apenas service_role
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS comissoes_select ON public.comissoes;
CREATE POLICY comissoes_select ON public.comissoes
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (
      public.tem_permissao(auth.uid(), 'PERM-003')
      OR public.has_role(auth.uid(), 'super_admin')
      -- profissional vê as próprias comissões sem precisar de PERM-003
      OR EXISTS (
        SELECT 1
        FROM public.profissionais pr
        JOIN public.usuarios u ON u.tenant_id = pr.tenant_id
        WHERE pr.id = comissoes.profissional_id
          AND u.auth_user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------
-- 10. RLS — audit_log
--     SELECT: apenas admin e super_admin do tenant
--     INSERT: apenas service_role
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );
