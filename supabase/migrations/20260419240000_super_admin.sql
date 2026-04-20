-- ============================================================
-- Migração: Infraestrutura do painel Super Admin
-- - Adiciona valor 'bloqueado' ao ENUM status_tenant
-- - Cria tabela planos com feature flags
-- - Adiciona plano_id + campos de bloqueio em tenants
-- - Semeia planos padrão correspondentes ao ENUM plano_tenant
-- - Adiciona RLS em planos
-- ============================================================

-- Adicionar status de bloqueio ao ENUM existente
ALTER TYPE public.status_tenant ADD VALUE IF NOT EXISTS 'bloqueado';

-- ── Tabela de planos ──────────────────────────────────────────────────────────
-- Referência gerenciada pelo super admin. O slug deve corresponder ao valor
-- do ENUM plano_tenant para que as queries de MRR funcionem via JOIN.
CREATE TABLE IF NOT EXISTS planos (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 TEXT    NOT NULL,
  -- Deve coincidir com o valor do ENUM plano_tenant (ex: 'freemium', 'basico')
  slug                 TEXT    NOT NULL UNIQUE,
  -- Preço mensal em centavos
  preco_centavos       INT     NOT NULL DEFAULT 0,
  -- NULL = ilimitado
  max_agendamentos_mes INT,
  max_profissionais    INT,
  max_unidades         INT     NOT NULL DEFAULT 1,
  -- Feature flags: objeto JSON com chaves booleanas
  -- Ex: { "agendamento_online": true, "ligacao_ia": false }
  features             JSONB   NOT NULL DEFAULT '{}',
  ativo                BOOLEAN NOT NULL DEFAULT true,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tocar_atualizado_em_planos
  BEFORE UPDATE ON planos
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();

-- Planos padrão correspondentes ao ENUM plano_tenant
INSERT INTO planos (nome, slug, preco_centavos, max_profissionais, max_unidades, features) VALUES
  ('Freemium', 'freemium',  0,      2,    1, '{"agendamento_online":true,"relatorios_basicos":false,"ligacao_ia":false,"multilojas":false}'),
  ('Básico',   'basico',    4900,   5,    1, '{"agendamento_online":true,"relatorios_basicos":true,"ligacao_ia":false,"multilojas":false}'),
  ('Profissional','profissional',9900,15, 3, '{"agendamento_online":true,"relatorios_basicos":true,"relatorios_avancados":true,"ligacao_ia":true,"multilojas":false}'),
  ('Premium',  'premium',  19900,  null, null,'{"agendamento_online":true,"relatorios_basicos":true,"relatorios_avancados":true,"ligacao_ia":true,"multilojas":true,"api_acesso":true}')
ON CONFLICT (slug) DO NOTHING;

-- ── Alterações em tenants ─────────────────────────────────────────────────────

-- FK opcional para o novo sistema de planos (não quebra registros antigos)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);

-- Campos de bloqueio administrativo
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bloqueado_em    TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

-- Preenchimento inicial do plano_id a partir do enum plano existente
UPDATE tenants t
SET    plano_id = p.id
FROM   planos p
WHERE  p.slug = t.plano::text
AND    t.plano_id IS NULL;

-- ── RLS de planos ─────────────────────────────────────────────────────────────
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler (exibido nas páginas de assinatura)
CREATE POLICY "planos_select_todos" ON planos
  FOR SELECT TO authenticated
  USING (true);

-- Apenas super_admin pode criar/editar/excluir
CREATE POLICY "planos_super_admin" ON planos
  FOR ALL TO authenticated
  USING     (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
