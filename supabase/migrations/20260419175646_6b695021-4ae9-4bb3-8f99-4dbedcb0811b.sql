
-- ============================================
-- Onboarding: tabelas de configuração, profissionais, serviços
-- ============================================

-- 1. Adiciona slug ao tenant para link público de agendamento
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- 2. Configurações do tenant (horário, cor, endereço, logo)
CREATE TABLE IF NOT EXISTS public.configuracoes_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  horario_funcionamento jsonb NOT NULL DEFAULT '{}'::jsonb,
  cor_principal text,
  endereco text,
  logo_url text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select_tenant" ON public.configuracoes_tenant
  FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_atual() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "config_insert_admin" ON public.configuracoes_tenant
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "config_update_admin" ON public.configuracoes_tenant
  FOR UPDATE TO authenticated
  USING (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE TRIGGER trg_config_atualizado_em
  BEFORE UPDATE ON public.configuracoes_tenant
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- 3. Profissionais
CREATE TABLE IF NOT EXISTS public.profissionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  especialidade text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profissionais_tenant ON public.profissionais(tenant_id);

ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prof_select_tenant" ON public.profissionais
  FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_atual() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "prof_insert_admin" ON public.profissionais
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "prof_update_admin" ON public.profissionais
  FOR UPDATE TO authenticated
  USING (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "prof_delete_admin" ON public.profissionais
  FOR DELETE TO authenticated
  USING (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE TRIGGER trg_prof_atualizado_em
  BEFORE UPDATE ON public.profissionais
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- 4. Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 30,
  preco_centavos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicos_tenant ON public.servicos(tenant_id);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serv_select_tenant" ON public.servicos
  FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_atual() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "serv_insert_admin" ON public.servicos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "serv_update_admin" ON public.servicos
  FOR UPDATE TO authenticated
  USING (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "serv_delete_admin" ON public.servicos
  FOR DELETE TO authenticated
  USING (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE TRIGGER trg_serv_atualizado_em
  BEFORE UPDATE ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- 5. Storage bucket público para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas: leitura pública, escrita pelo dono do tenant (path: {tenant_id}/...)
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "logos_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = get_tenant_atual()::text
  );

CREATE POLICY "logos_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = get_tenant_atual()::text
  );

CREATE POLICY "logos_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = get_tenant_atual()::text
  );
