-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Protocolos
CREATE TABLE public.estetica_protocolos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    numero_sessoes INTEGER NOT NULL DEFAULT 1,
    intervalo_minimo_dias INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Modelos de Anamnese
CREATE TABLE public.estetica_anamneses_modelos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    protocolo_id UUID REFERENCES public.estetica_protocolos(id) ON DELETE SET NULL,
    campos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Anamneses Preenchidas
CREATE TABLE public.estetica_anamneses_preenchidas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    modelo_id UUID NOT NULL REFERENCES public.estetica_anamneses_modelos(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
    assinatura_url TEXT,
    pdf_url TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Fotos de Evolução
CREATE TABLE public.estetica_fotos_evolucao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    protocolo_id UUID REFERENCES public.estetica_protocolos(id) ON DELETE SET NULL,
    foto_url TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('antes', 'depois', 'atual')),
    data_foto TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alterar agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN protocolo_id UUID REFERENCES public.estetica_protocolos(id) ON DELETE SET NULL,
ADD COLUMN numero_sessao INTEGER;

-- Ativar RLS
ALTER TABLE public.estetica_protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estetica_anamneses_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estetica_anamneses_preenchidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estetica_fotos_evolucao ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Protocols tenant isolation" ON public.estetica_protocolos
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Anamnesis models tenant isolation" ON public.estetica_anamneses_modelos
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Filled anamnesis tenant isolation" ON public.estetica_anamneses_preenchidas
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Evolution photos tenant isolation and permission" ON public.estetica_fotos_evolucao
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.permissoes_do_perfil pdp
            JOIN public.usuarios u ON u.perfil_id = pdp.perfil_id
            WHERE u.auth_user_id = auth.uid() AND pdp.codigo_permissao = 'PERM-007'
        )
    );

-- Gatilhos
CREATE TRIGGER tr_estetica_protocolos_updated_at BEFORE UPDATE ON public.estetica_protocolos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_estetica_anamneses_modelos_updated_at BEFORE UPDATE ON public.estetica_anamneses_modelos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_estetica_anamneses_preenchidas_updated_at BEFORE UPDATE ON public.estetica_anamneses_preenchidas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('estetica', 'estetica', false) ON CONFLICT (id) DO NOTHING;

-- Storage Policy
CREATE POLICY "Tenant isolation for storage" ON storage.objects
    FOR ALL USING (
        bucket_id = 'estetica' 
        AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.usuarios WHERE auth_user_id = auth.uid())
    );
