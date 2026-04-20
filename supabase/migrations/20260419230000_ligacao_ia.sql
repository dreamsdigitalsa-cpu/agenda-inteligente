-- ============================================================
-- Migração: Sistema de ligação IA (ElevenLabs + Twilio)
-- Tabelas: ligacoes_ia, configuracoes_ligacao_ia, configuracoes_sistema
-- Storage:  ligacoes-audio (bucket público para áudios gerados)
-- ============================================================

-- ── Histórico de ligações IA ──────────────────────────────────────────────────
CREATE TABLE ligacoes_ia (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agendamento_id   UUID    REFERENCES agendamentos(id) ON DELETE SET NULL,
  cliente_id       UUID    REFERENCES clientes(id) ON DELETE SET NULL,
  -- SID retornado pela API do Twilio após iniciar a ligação
  twilio_call_sid  TEXT,
  -- Ciclo de vida: iniciando → em_andamento → concluida | sem_resposta | falhou
  status           TEXT    NOT NULL DEFAULT 'iniciando',
  -- Resultado do DTMF: confirmado | cancelado | transferido | sem_resposta | NULL (falhou antes)
  resultado        TEXT,
  -- Dígito pressionado pelo cliente (1, 2 ou 3)
  dtmf             TEXT,
  duracao_segundos INT,
  -- URL pública do áudio gerado pelo ElevenLabs e armazenado no Storage
  audio_url        TEXT,
  -- Custo estimado em centavos (informativo; calculado após a ligação)
  custo_centavos   INT,
  erro             TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tocar_atualizado_em_ligacoes_ia
  BEFORE UPDATE ON ligacoes_ia
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();

CREATE INDEX idx_ligacoes_ia_tenant_status ON ligacoes_ia(tenant_id, status);
CREATE INDEX idx_ligacoes_ia_agendamento    ON ligacoes_ia(agendamento_id);
CREATE INDEX idx_ligacoes_ia_twilio_sid     ON ligacoes_ia(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;

-- ── Configurações de ligação IA por tenant ────────────────────────────────────
-- Permite que cada estabelecimento ative/desative ligações IA individualmente
-- e defina suas preferências (quantas horas antes ligar, telefone para transferência).
CREATE TABLE configuracoes_ligacao_ia (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID    NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  -- Se false, ligações IA não serão iniciadas para este tenant mesmo com config global ativa
  ativo                 BOOLEAN NOT NULL DEFAULT false,
  -- Quantas horas antes do agendamento iniciar a ligação (padrão: 24)
  horas_antecedencia    INT     NOT NULL DEFAULT 24
                         CHECK (horas_antecedencia BETWEEN 1 AND 48),
  -- Número para onde o cliente é transferido ao pressionar 3
  -- Formato: somente dígitos, com DDD, sem +55 (ex: 11999998888)
  telefone_estabelecimento TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tocar_atualizado_em_config_ligacao_ia
  BEFORE UPDATE ON configuracoes_ligacao_ia
  FOR EACH ROW EXECUTE FUNCTION tocar_atualizado_em();

-- ── Configurações globais do sistema (super admin) ────────────────────────────
-- Armazena credenciais e flags de feature de nível plataforma.
-- Chaves sensíveis seguem a convenção de terminar em '_credenciais';
-- as demais são legíveis por qualquer usuário autenticado (ver RLS abaixo).
--
-- Chaves usadas pelo módulo de ligação IA:
--   'ligacao_ia_config'      → { ativo: bool, horario_inicio: '09:00', horario_fim: '19:00' }
--   'ligacao_ia_credenciais' → { elevenlabs_api_key, elevenlabs_voice_id,
--                                twilio_account_sid, twilio_auth_token, twilio_numero }
CREATE TABLE configuracoes_sistema (
  chave         TEXT    PRIMARY KEY,
  valor         JSONB   NOT NULL DEFAULT '{}',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valores padrão para não quebrar a leitura antes da primeira configuração
INSERT INTO configuracoes_sistema (chave, valor) VALUES
  ('ligacao_ia_config', '{"ativo":false,"horario_inicio":"09:00","horario_fim":"19:00"}'::jsonb),
  ('ligacao_ia_credenciais', '{}'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- ── Storage: bucket para áudios do ElevenLabs ────────────────────────────────
-- Público para que o Twilio possa buscar o MP3 sem autenticação.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ligacoes-audio', 'ligacoes-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer cliente (incluindo Twilio) pode ler os áudios
CREATE POLICY "ligacoes_audio_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ligacoes-audio');

-- Somente service_role (Edge Functions) pode fazer upload
CREATE POLICY "ligacoes_audio_insert" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'ligacoes-audio');

-- Limpeza de áudios antigos via service_role
CREATE POLICY "ligacoes_audio_delete" ON storage.objects
  FOR DELETE TO service_role
  USING (bucket_id = 'ligacoes-audio');

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE ligacoes_ia                ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_ligacao_ia   ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_sistema      ENABLE ROW LEVEL SECURITY;

-- Histórico de ligações: quem tem PERM-003 no tenant
CREATE POLICY "ligacoes_ia_select" ON ligacoes_ia
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (
      public.tem_permissao(auth.uid(), 'PERM-003')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Config por tenant: leitura para membros do tenant, escrita para admin
CREATE POLICY "config_ligacao_ia_select" ON configuracoes_ligacao_ia
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_atual());

CREATE POLICY "config_ligacao_ia_insert" ON configuracoes_ligacao_ia
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_tenant_atual()
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "config_ligacao_ia_update" ON configuracoes_ligacao_ia
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_tenant_atual()
    AND public.has_role(auth.uid(), 'admin')
  );

-- Configurações sistema: super_admin lê e escreve tudo;
-- autenticados comuns podem ler apenas chaves sem 'credenciais' no nome.
CREATE POLICY "config_sistema_super_admin_all" ON configuracoes_sistema
  FOR ALL TO authenticated
  USING     (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Leitura pública das chaves não-sensíveis (ex: ligacao_ia_config com o flag ativo)
CREATE POLICY "config_sistema_read_public" ON configuracoes_sistema
  FOR SELECT TO authenticated
  USING (chave NOT LIKE '%credenciais%');
