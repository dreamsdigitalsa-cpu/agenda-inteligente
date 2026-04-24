-- Create enum for queue status
DO $$ BEGIN
    CREATE TYPE status_fila AS ENUM ('aguardando', 'chamado', 'atendido', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.fila_espera (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  posicao INTEGER NOT NULL,
  status status_fila NOT NULL DEFAULT 'aguardando',
  entrada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  chamado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Tenants can manage their own waitlist"
ON public.fila_espera
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Policy for public to join the waitlist
CREATE POLICY "Public can join waitlist"
ON public.fila_espera
FOR INSERT
TO anon
WITH CHECK (status = 'aguardando');

-- Policy for public to view their own waitlist status (if they have the ID)
-- Or just allow viewing all for now if we filter by tenant_id in the frontend
-- Actually, the TV needs to view the waitlist.
CREATE POLICY "Public can view waitlist"
ON public.fila_espera
FOR SELECT
TO anon
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fila_espera_tenant_status ON public.fila_espera(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fila_espera_unidade ON public.fila_espera(unidade_id);
CREATE INDEX IF NOT EXISTS idx_fila_espera_posicao ON public.fila_espera(posicao);

-- Trigger for updated_at if function exists
DO $$ BEGIN
  CREATE TRIGGER update_fila_espera_updated_at
  BEFORE UPDATE ON public.fila_espera
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN undefined_function THEN null;
END $$;
