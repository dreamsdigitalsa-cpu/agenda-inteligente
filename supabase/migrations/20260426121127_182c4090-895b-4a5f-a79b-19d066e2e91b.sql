-- Vincular profissionais a usuários de login + dados extras
ALTER TABLE public.profissionais 
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_tipo TEXT NOT NULL DEFAULT 'percentual' CHECK (comissao_tipo IN ('percentual', 'fixo')),
  ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(12,2) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

CREATE INDEX IF NOT EXISTS idx_profissionais_usuario ON public.profissionais(usuario_id);

-- Horário individual do profissional (sobrepõe horário do estabelecimento)
CREATE TABLE IF NOT EXISTS public.horarios_profissional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  intervalo_inicio TIME,
  intervalo_fim TIME,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profissional_id, dia_semana)
);

ALTER TABLE public.horarios_profissional ENABLE ROW LEVEL SECURITY;

-- Se a função get_tenant_atual() ou has_role() não existirem, o usuário terá que criá-las ou adaptar. 
-- Assumindo que o projeto segue o padrão StudioFlow já estabelecido.

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'horarios_prof_select') THEN
    CREATE POLICY horarios_prof_select ON public.horarios_profissional
      FOR SELECT TO authenticated
      USING (tenant_id = public.get_tenant_atual());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'horarios_prof_modify') THEN
    CREATE POLICY horarios_prof_modify ON public.horarios_profissional
      FOR ALL TO authenticated
      USING (
        tenant_id = public.get_tenant_atual()
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM public.profissionais p
            JOIN public.usuarios u ON u.id = p.usuario_id
            WHERE p.id = profissional_id AND u.auth_user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Bloqueios de agenda (folga, atestado, almoço, etc)
CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  tipo TEXT NOT NULL DEFAULT 'pessoal' CHECK (tipo IN ('pessoal', 'atestado', 'folga', 'feriado', 'almoco')),
  criado_por_usuario_id UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bloqueios_intervalo_valido CHECK (fim > inicio)
);

CREATE INDEX IF NOT EXISTS idx_bloqueios_profissional ON public.bloqueios_agenda(profissional_id, inicio);
CREATE INDEX IF NOT EXISTS idx_bloqueios_periodo ON public.bloqueios_agenda(tenant_id, inicio, fim);

ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bloqueios_select') THEN
    CREATE POLICY bloqueios_select ON public.bloqueios_agenda
      FOR SELECT TO authenticated
      USING (tenant_id = public.get_tenant_atual());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bloqueios_modify') THEN
    CREATE POLICY bloqueios_modify ON public.bloqueios_agenda
      FOR ALL TO authenticated
      USING (
        tenant_id = public.get_tenant_atual()
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM public.profissionais p
            JOIN public.usuarios u ON u.id = p.usuario_id
            WHERE p.id = profissional_id AND u.auth_user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;