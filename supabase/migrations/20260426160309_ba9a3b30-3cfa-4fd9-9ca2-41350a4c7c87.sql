-- Inserir o usuário na tabela usuarios vinculando corretamente ao auth.users
INSERT INTO public.usuarios (id, auth_user_id, email, nome, tenant_id)
SELECT 
    id, -- Usando o mesmo UUID do auth para o ID da tabela usuarios
    id, -- Preenchendo auth_user_id (obrigatório)
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email) as nome,
    NULL as tenant_id
FROM auth.users
WHERE email = 'diretoria@nexaapp.com.br'
ON CONFLICT (id) DO UPDATE 
SET 
    auth_user_id = EXCLUDED.auth_user_id,
    nome = EXCLUDED.nome, 
    email = EXCLUDED.email;

-- Garantir que a role super_admin esteja atribuída na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'diretoria@nexaapp.com.br'
ON CONFLICT DO NOTHING;