-- Tabela de clientes por tenant
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  data_nascimento date,
  como_conheceu text,
  observacoes text,
  tem_conta boolean NOT NULL DEFAULT false,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis para busca e filtros
CREATE INDEX idx_clientes_tenant ON public.clientes(tenant_id);
CREATE INDEX idx_clientes_tenant_nome ON public.clientes(tenant_id, lower(nome));
CREATE INDEX idx_clientes_tenant_telefone ON public.clientes(tenant_id, telefone);
CREATE INDEX idx_clientes_aniversario ON public.clientes(tenant_id, (extract(month from data_nascimento)));

-- Trigger para manter atualizado_em
CREATE TRIGGER trg_clientes_atualizado_em
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário do tenant pode ler clientes do próprio tenant
CREATE POLICY clientes_select_tenant
ON public.clientes
FOR SELECT
TO authenticated
USING (tenant_id = public.get_tenant_atual() OR public.has_role(auth.uid(), 'super_admin'));

-- Qualquer usuário autenticado do tenant pode inserir
CREATE POLICY clientes_insert_tenant
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_tenant_atual());

-- Apenas admin ou super_admin atualiza
CREATE POLICY clientes_update_admin
ON public.clientes
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_tenant_atual()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- Apenas admin ou super_admin remove
CREATE POLICY clientes_delete_admin
ON public.clientes
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_tenant_atual()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);