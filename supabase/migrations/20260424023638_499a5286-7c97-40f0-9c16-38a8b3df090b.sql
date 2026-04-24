-- Create types for tattoo module
DO $$ BEGIN
  CREATE TYPE public.tattoo_budget_status AS ENUM ('em_analise', 'aprovado', 'em_andamento', 'concluido');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table for Tattoo Budgets
CREATE TABLE IF NOT EXISTS public.tattoo_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  regiao_corpo text NOT NULL,
  tamanho text NOT NULL,
  estilo text NOT NULL,
  descricao text,
  valor_estimado numeric(12,2),
  valor_deposito numeric(12,2) DEFAULT 0,
  deposito_pago boolean DEFAULT false,
  status public.tattoo_budget_status NOT NULL DEFAULT 'em_analise',
  referencias text[], -- array of image URLs
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Table for Tattoo Sessions (linked to budgets)
CREATE TABLE IF NOT EXISTS public.tattoo_budget_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.tattoo_budgets(id) ON DELETE CASCADE,
  agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  data timestamptz NOT NULL DEFAULT now(),
  notas text,
  valor numeric(12,2),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Table for Tattoo Portfolio
CREATE TABLE IF NOT EXISTS public.tattoo_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  imagem_url text NOT NULL,
  estilo text NOT NULL,
  categoria text,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tattoo_budgets_tenant ON public.tattoo_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tattoo_budgets_cliente ON public.tattoo_budgets(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tattoo_budget_sessions_budget ON public.tattoo_budget_sessions(budget_id);
CREATE INDEX IF NOT EXISTS idx_tattoo_portfolio_tenant ON public.tattoo_portfolio_items(tenant_id);

-- Enable RLS
ALTER TABLE public.tattoo_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tattoo_budget_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tattoo_portfolio_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- tattoo_budgets
DROP POLICY IF EXISTS tattoo_budgets_select ON public.tattoo_budgets;
CREATE POLICY tattoo_budgets_select ON public.tattoo_budgets
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_atual());

DROP POLICY IF EXISTS tattoo_budgets_insert ON public.tattoo_budgets;
CREATE POLICY tattoo_budgets_insert ON public.tattoo_budgets
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_atual());

DROP POLICY IF EXISTS tattoo_budgets_update ON public.tattoo_budgets;
CREATE POLICY tattoo_budgets_update ON public.tattoo_budgets
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_atual());

-- tattoo_budget_sessions
DROP POLICY IF EXISTS tattoo_budget_sessions_select ON public.tattoo_budget_sessions;
CREATE POLICY tattoo_budget_sessions_select ON public.tattoo_budget_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tattoo_budgets b WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_atual()));

DROP POLICY IF EXISTS tattoo_budget_sessions_insert ON public.tattoo_budget_sessions;
CREATE POLICY tattoo_budget_sessions_insert ON public.tattoo_budget_sessions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tattoo_budgets b WHERE b.id = budget_id AND b.tenant_id = public.get_tenant_atual()));

-- tattoo_portfolio_items
DROP POLICY IF EXISTS tattoo_portfolio_items_select ON public.tattoo_portfolio_items;
CREATE POLICY tattoo_portfolio_items_select ON public.tattoo_portfolio_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS tattoo_portfolio_items_manage ON public.tattoo_portfolio_items;
CREATE POLICY tattoo_portfolio_items_manage ON public.tattoo_portfolio_items
  FOR ALL TO authenticated
  USING (tenant_id = public.get_tenant_atual());

-- Triggers for updated_at
CREATE TRIGGER trg_tattoo_budgets_updated_at BEFORE UPDATE ON public.tattoo_budgets FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
CREATE TRIGGER trg_tattoo_budget_sessions_updated_at BEFORE UPDATE ON public.tattoo_budget_sessions FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
CREATE TRIGGER trg_tattoo_portfolio_items_updated_at BEFORE UPDATE ON public.tattoo_portfolio_items FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tattoo-portfolio', 'tattoo-portfolio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('tattoo-references', 'tattoo-references', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Portfolio items are public" ON storage.objects;
CREATE POLICY "Portfolio items are public" ON storage.objects FOR SELECT USING (bucket_id = 'tattoo-portfolio');
DROP POLICY IF EXISTS "Professionals can upload portfolio" ON storage.objects;
CREATE POLICY "Professionals can upload portfolio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tattoo-portfolio');

DROP POLICY IF EXISTS "References are public" ON storage.objects;
CREATE POLICY "References are public" ON storage.objects FOR SELECT USING (bucket_id = 'tattoo-references');
DROP POLICY IF EXISTS "Professionals can upload references" ON storage.objects;
CREATE POLICY "Professionals can upload references" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tattoo-references');