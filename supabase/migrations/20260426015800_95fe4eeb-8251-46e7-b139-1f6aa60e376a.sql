-- Tabela de configurações específicas por segmento
CREATE TABLE IF NOT EXISTS public.configuracoes_segmento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  segmento TEXT NOT NULL,
  configuracoes JSONB NOT NULL DEFAULT '{}',
  configurado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_config_segmento_upd
  BEFORE UPDATE ON public.configuracoes_segmento
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

ALTER TABLE public.configuracoes_segmento ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_segmento_select ON public.configuracoes_segmento
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_atual());

CREATE POLICY config_segmento_insert ON public.configuracoes_segmento
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_tenant_atual() 
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY config_segmento_update ON public.configuracoes_segmento
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_tenant_atual() 
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY config_segmento_delete ON public.configuracoes_segmento
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_tenant_atual() 
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

-- Tabela de combos de serviços (usada por salão)
CREATE TABLE IF NOT EXISTS public.combos_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  preco NUMERIC(12,2) NOT NULL,
  servicos_ids UUID[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_combos_servicos_upd
  BEFORE UPDATE ON public.combos_servicos
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

ALTER TABLE public.combos_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY combos_select ON public.combos_servicos
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_atual());

CREATE POLICY combos_insert ON public.combos_servicos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_atual());

CREATE POLICY combos_update ON public.combos_servicos
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_atual());

CREATE POLICY combos_delete ON public.combos_servicos
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_atual());