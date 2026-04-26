-- Add missing columns to configuracoes_tenant if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracoes_tenant' AND COLUMN_NAME = 'cnpj') THEN
        ALTER TABLE public.configuracoes_tenant ADD COLUMN cnpj TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracoes_tenant' AND COLUMN_NAME = 'telefone') THEN
        ALTER TABLE public.configuracoes_tenant ADD COLUMN telefone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracoes_tenant' AND COLUMN_NAME = 'slug_publico') THEN
        ALTER TABLE public.configuracoes_tenant ADD COLUMN slug_publico TEXT;
    END IF;
END $$;

-- Ensure slug_publico is unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_tenant_slug_publico_key') THEN
        ALTER TABLE public.configuracoes_tenant ADD CONSTRAINT configuracoes_tenant_slug_publico_key UNIQUE (slug_publico);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.configuracoes_tenant ENABLE ROW LEVEL SECURITY;

-- Policies for configuracoes_tenant
DROP POLICY IF EXISTS "Users can view their own tenant config" ON public.configuracoes_tenant;
CREATE POLICY "Users can view their own tenant config" 
ON public.configuracoes_tenant 
FOR SELECT 
USING (tenant_id = (SELECT get_tenant_atual()));

DROP POLICY IF EXISTS "Admins can update their own tenant config" ON public.configuracoes_tenant;
CREATE POLICY "Admins can update their own tenant config" 
ON public.configuracoes_tenant 
FOR UPDATE 
USING (
  tenant_id = (SELECT get_tenant_atual()) AND 
  (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')) OR
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN permissoes_do_perfil p ON u.perfil_id = p.perfil_id 
      WHERE u.auth_user_id = auth.uid() AND p.codigo_permissao = 'PERM-005'
    )
  )
);

DROP POLICY IF EXISTS "Admins can insert their own tenant config" ON public.configuracoes_tenant;
CREATE POLICY "Admins can insert their own tenant config" 
ON public.configuracoes_tenant 
FOR INSERT 
WITH CHECK (
  tenant_id = (SELECT get_tenant_atual()) AND 
  (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')) OR
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN permissoes_do_perfil p ON u.perfil_id = p.perfil_id 
      WHERE u.auth_user_id = auth.uid() AND p.codigo_permissao = 'PERM-005'
    )
  )
);
