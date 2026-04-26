-- Insere os papéis para o usuário específico
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('e9b24bef-2f11-4753-824a-a27bb3a6e174', 'admin'),
  ('e9b24bef-2f11-4753-824a-a27bb3a6e174', 'super_admin')
ON CONFLICT DO NOTHING;