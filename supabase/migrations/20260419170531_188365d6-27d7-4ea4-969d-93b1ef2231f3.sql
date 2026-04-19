-- 1) ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'profissional', 'recepcionista');
CREATE TYPE public.segmento_tenant AS ENUM ('salao', 'barbearia', 'estetica', 'tatuagem', 'manicure');
CREATE TYPE public.plano_tenant AS ENUM ('freemium', 'profissional');
CREATE TYPE public.status_tenant AS ENUM ('ativo', 'suspenso', 'cancelado');

-- 2) TABELA tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  segmento public.segmento_tenant NOT NULL,
  plano public.plano_tenant NOT NULL DEFAULT 'freemium',
  status public.status_tenant NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) TABELA unidades
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_unidades_tenant ON public.unidades(tenant_id);

-- 4) TABELA usuarios (perfil ligado ao auth.users)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);
CREATE INDEX idx_usuarios_auth ON public.usuarios(auth_user_id);

-- 5) TABELA user_roles (separada — previne escalada de privilégios)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- 6) FUNÇÃO has_role — SECURITY DEFINER para evitar recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7) FUNÇÃO get_tenant_atual — retorna tenant_id do usuário logado sem causar recursão
CREATE OR REPLACE FUNCTION public.get_tenant_atual()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- 8) Trigger para manter atualizado_em
CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_upd BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
CREATE TRIGGER trg_unidades_upd BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
CREATE TRIGGER trg_usuarios_upd BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- 9) RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- tenants: usuário do tenant ou super_admin pode ler; apenas super_admin altera
CREATE POLICY "tenants_select_proprio" ON public.tenants FOR SELECT TO authenticated
  USING (id = public.get_tenant_atual() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tenants_update_super_admin" ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tenants_insert_super_admin" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tenants_delete_super_admin" ON public.tenants FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- unidades: isolamento por tenant
CREATE POLICY "unidades_select_tenant" ON public.unidades FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_atual() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "unidades_admin_insert" ON public.unidades FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_atual() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "unidades_admin_update" ON public.unidades FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_atual() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "unidades_admin_delete" ON public.unidades FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_atual() AND public.has_role(auth.uid(), 'admin'));

-- usuarios: cada um vê o próprio + os do mesmo tenant; super_admin vê todos
CREATE POLICY "usuarios_select_proprio_ou_tenant" ON public.usuarios FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR tenant_id = public.get_tenant_atual()
    OR public.has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "usuarios_update_proprio_dados" ON public.usuarios FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "usuarios_admin_insert" ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- user_roles: usuário vê apenas os próprios roles; só super_admin altera
CREATE POLICY "roles_select_proprios" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "roles_super_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "roles_super_admin_update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "roles_super_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));