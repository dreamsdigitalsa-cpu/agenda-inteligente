-- Garantir que o usuário diretoria@nexaapp.com.br tenha o papel de super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('30dd0c5c-6d90-43d0-a91e-ddd669a9bb65', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;