-- Tabela para lançamentos manuais do administrador (fora as faturas automáticas dos tenants)
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria TEXT NOT NULL,
    valor NUMERIC(15,2) NOT NULL,
    descricao TEXT,
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lancamentos_financeiros_admin ENABLE ROW LEVEL SECURITY;

-- Políticas usando a tabela 'user_roles' que parece existir no projeto
CREATE POLICY "Super admins podem gerenciar lançamentos financeiros"
ON public.lancamentos_financeiros_admin
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
);

-- Trigger para updated_at (usando a função genérica que costuma existir ou criando-a)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lancamentos_financeiros_admin_updated_at
BEFORE UPDATE ON public.lancamentos_financeiros_admin
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
