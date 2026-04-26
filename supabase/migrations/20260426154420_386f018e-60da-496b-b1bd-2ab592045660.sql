-- 1. Atualizar a política de visualização para permitir Super Admins
DROP POLICY IF EXISTS "Users can view their own tenant config" ON public.configuracoes_tenant;
CREATE POLICY "Users can view their own tenant config" 
ON public.configuracoes_tenant 
FOR SELECT 
USING (
  tenant_id = get_tenant_atual() 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 2. Atualizar a política de inserção para permitir Super Admins
DROP POLICY IF EXISTS "Admins can insert their own tenant config" ON public.configuracoes_tenant;
CREATE POLICY "Admins can insert their own tenant config" 
ON public.configuracoes_tenant 
FOR INSERT 
WITH CHECK (
  tenant_id = get_tenant_atual() 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 3. Atualizar a política de atualização para permitir Super Admins
DROP POLICY IF EXISTS "Admins can update their own tenant config" ON public.configuracoes_tenant;
CREATE POLICY "Admins can update their own tenant config" 
ON public.configuracoes_tenant 
FOR UPDATE 
USING (
  tenant_id = get_tenant_atual() 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);