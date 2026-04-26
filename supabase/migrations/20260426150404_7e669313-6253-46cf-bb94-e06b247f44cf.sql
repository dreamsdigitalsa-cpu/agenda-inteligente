-- Criar tabela de convites para novos usuários
CREATE TABLE IF NOT EXISTS public.convites_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'profissional',
    perfil_id UUID REFERENCES public.perfis_permissao(id) ON DELETE SET NULL,
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'expirado', 'cancelado')),
    expira_em TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    utilizado_em TIMESTAMPTZ
);

-- Criar índice de unicidade parcial para convites pendentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_convite_pendente_unico 
ON public.convites_usuario (tenant_id, email) 
WHERE status = 'pendente';

-- Habilitar RLS
ALTER TABLE public.convites_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso usando subquery direta para evitar problemas de cast com a função has_role
CREATE POLICY "Admins podem gerenciar convites do seu tenant"
ON public.convites_usuario
FOR ALL
TO authenticated
USING (
    tenant_id = (SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'::public.app_role
    )
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'::public.app_role
    )
);

-- Permitir leitura pública do convite via token (para a página de aceite)
CREATE POLICY "Leitura de convite via token"
ON public.convites_usuario
FOR SELECT
TO anon, authenticated
USING (status = 'pendente' AND expira_em > now());

-- Adicionar índice para busca por token
CREATE INDEX IF NOT EXISTS idx_convites_token ON public.convites_usuario(token);
