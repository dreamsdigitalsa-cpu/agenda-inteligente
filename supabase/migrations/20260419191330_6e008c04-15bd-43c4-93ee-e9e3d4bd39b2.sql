-- Tabelas para sistema de permissões granulares por perfil
-- perfis_permissao: cada tenant tem seus perfis (Admin, Profissional, Recepcionista + customizados)
CREATE TABLE public.perfis_permissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

-- permissoes_do_perfil: relação N:N entre perfis e códigos de permissão (PERM-001, etc.)
CREATE TABLE public.permissoes_do_perfil (
  perfil_id UUID NOT NULL REFERENCES public.perfis_permissao(id) ON DELETE CASCADE,
  codigo_permissao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (perfil_id, codigo_permissao)
);

-- Adicionar perfil_id em usuarios (cada usuário tem um perfil)
ALTER TABLE public.usuarios
  ADD COLUMN perfil_id UUID REFERENCES public.perfis_permissao(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.perfis_permissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_do_perfil ENABLE ROW LEVEL SECURITY;

-- RLS perfis_permissao: leitura para todos do tenant; escrita só admin
CREATE POLICY "perfis_select_tenant" ON public.perfis_permissao
  FOR SELECT TO authenticated
  USING (tenant_id = get_tenant_atual() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "perfis_insert_admin" ON public.perfis_permissao
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "perfis_update_admin" ON public.perfis_permissao
  FOR UPDATE TO authenticated
  USING (tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "perfis_delete_admin" ON public.perfis_permissao
  FOR DELETE TO authenticated
  USING (tenant_id = get_tenant_atual() AND NOT padrao AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

-- RLS permissoes_do_perfil: derivada via perfil
CREATE POLICY "perm_perfil_select" ON public.permissoes_do_perfil
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_permissao p WHERE p.id = perfil_id AND (p.tenant_id = get_tenant_atual() OR has_role(auth.uid(), 'super_admin'::app_role))));

CREATE POLICY "perm_perfil_insert_admin" ON public.permissoes_do_perfil
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_permissao p WHERE p.id = perfil_id AND p.tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

CREATE POLICY "perm_perfil_delete_admin" ON public.permissoes_do_perfil
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_permissao p WHERE p.id = perfil_id AND p.tenant_id = get_tenant_atual() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Trigger atualizado_em
CREATE TRIGGER trg_perfis_atualizado
  BEFORE UPDATE ON public.perfis_permissao
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- Função helper: retorna true se o usuário possui a permissão (via perfil)
CREATE OR REPLACE FUNCTION public.tem_permissao(_user_id UUID, _codigo TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.usuarios u
      JOIN public.permissoes_do_perfil pp ON pp.perfil_id = u.perfil_id
      WHERE u.auth_user_id = _user_id AND pp.codigo_permissao = _codigo
    );
$$;