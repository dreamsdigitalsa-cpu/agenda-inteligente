-- Enum de status do agendamento
DO $$ BEGIN
  CREATE TYPE public.status_agendamento AS ENUM (
    'agendado','confirmado','em_atendimento','concluido','cancelado','faltou'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Enum de origem do agendamento
DO $$ BEGIN
  CREATE TYPE public.origem_agendamento AS ENUM ('painel','online','whatsapp','telefone');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  unidade_id uuid,
  cliente_id uuid NOT NULL,
  profissional_id uuid NOT NULL,
  servico_id uuid NOT NULL,
  data_hora_inicio timestamptz NOT NULL,
  data_hora_fim timestamptz NOT NULL,
  status public.status_agendamento NOT NULL DEFAULT 'agendado',
  origem public.origem_agendamento NOT NULL DEFAULT 'painel',
  confirmacao_manual_necessaria boolean NOT NULL DEFAULT false,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agendamentos_intervalo_valido CHECK (data_hora_fim > data_hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_dia
  ON public.agendamentos (tenant_id, data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_dia
  ON public.agendamentos (profissional_id, data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente
  ON public.agendamentos (cliente_id);

-- Trigger de atualizado_em (função já existe: public.tocar_atualizado_em)
DROP TRIGGER IF EXISTS trg_agendamentos_atualizado_em ON public.agendamentos;
CREATE TRIGGER trg_agendamentos_atualizado_em
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agendamentos_select_tenant ON public.agendamentos;
CREATE POLICY agendamentos_select_tenant ON public.agendamentos
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_atual() OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS agendamentos_insert_tenant ON public.agendamentos;
CREATE POLICY agendamentos_insert_tenant ON public.agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_atual());

DROP POLICY IF EXISTS agendamentos_update_admin ON public.agendamentos;
CREATE POLICY agendamentos_update_admin ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

DROP POLICY IF EXISTS agendamentos_delete_admin ON public.agendamentos;
CREATE POLICY agendamentos_delete_admin ON public.agendamentos
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_tenant_atual()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );

-- Habilitar Realtime
ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
EXCEPTION WHEN duplicate_object THEN null; END $$;