-- 1) Confirmar e-mail (confirmed_at é gerado automaticamente a partir de email_confirmed_at)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = '6e34166d-c021-4692-a0bb-461b1a1dd63d' AND email_confirmed_at IS NULL;

-- 2) Criar tenant + unidade + usuario + roles
DO $$
DECLARE
  v_tenant_id uuid;
  v_unidade_id uuid;
  v_auth_id uuid := '6e34166d-c021-4692-a0bb-461b1a1dd63d';
BEGIN
  INSERT INTO public.tenants (nome, segmento, plano)
  VALUES ('Estabelecimento do João', 'salao', 'freemium')
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.unidades (tenant_id, nome)
  VALUES (v_tenant_id, 'Unidade principal')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.usuarios (auth_user_id, tenant_id, unidade_id, nome, email)
  VALUES (v_auth_id, v_tenant_id, v_unidade_id, 'Vasconcelos', 'joaodev.developer@gmail.com');

  INSERT INTO public.user_roles (user_id, role) VALUES (v_auth_id, 'admin');
  INSERT INTO public.user_roles (user_id, role) VALUES (v_auth_id, 'super_admin');
END $$;