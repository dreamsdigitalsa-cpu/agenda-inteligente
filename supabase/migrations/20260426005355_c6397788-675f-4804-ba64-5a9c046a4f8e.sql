-- 1. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(12,2) NOT NULL,
  intervalo TEXT NOT NULL DEFAULT 'mensal', -- mensal, anual
  features TEXT[] DEFAULT '{}',
  limites JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Integrações da Plataforma (Keys de Gateways)
CREATE TABLE IF NOT EXISTS public.integracoes_plataforma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE, -- 'stripe', 'asaas', 'pagarme'
  configuracoes JSONB NOT NULL, -- { api_key, webhook_secret, public_key }
  ativo BOOLEAN DEFAULT true,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Assinaturas (Conforme solicitado)
CREATE TABLE IF NOT EXISTS public.assinaturas_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  plano_id UUID NOT NULL REFERENCES planos(id),
  
  gateway TEXT NOT NULL,  -- 'stripe' | 'asaas' | 'pagarme'
  gateway_subscription_id TEXT,
  gateway_customer_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'trial',  -- trial | ativa | inadimplente | cancelada
  
  inicio_trial DATE DEFAULT CURRENT_DATE,
  fim_trial DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  proxima_cobranca DATE,
  ultimo_pagamento DATE,
  
  metodo_pagamento JSONB,  -- {tipo: 'cartao'|'boleto'|'pix', last4, bandeira}
  
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Faturas
CREATE TABLE IF NOT EXISTS public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assinatura_id UUID NOT NULL REFERENCES assinaturas_tenant(id),
  
  gateway_invoice_id TEXT,
  valor NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL,  -- pendente | paga | atrasada | cancelada
  
  vencimento DATE NOT NULL,
  pago_em TIMESTAMPTZ,
  
  url_boleto TEXT,
  url_nota_fiscal TEXT,
  
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. Função has_perm para RLS
CREATE OR REPLACE FUNCTION public.has_perm(perm_codigo text)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_perfil_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;

  -- 1. Verifica se é super_admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'super_admin'
  ) INTO v_is_super;

  IF v_is_super THEN RETURN true; END IF;

  -- 2. Busca perfil do usuário
  SELECT perfil_id INTO v_perfil_id FROM usuarios WHERE auth_user_id = v_user_id;
  
  IF v_perfil_id IS NULL THEN RETURN false; END IF;

  -- 3. Verifica permissão no perfil
  RETURN EXISTS (
    SELECT 1 FROM permissoes_do_perfil 
    WHERE perfil_id = v_perfil_id AND codigo_permissao = perm_codigo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes_plataforma ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos visíveis por todos autenticados" ON planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas super_admin edita planos" ON planos FOR ALL TO authenticated USING (has_perm('PERM-000')) WITH CHECK (has_perm('PERM-000'));

CREATE POLICY "Integrações apenas super_admin" ON integracoes_plataforma FOR ALL TO authenticated USING (has_perm('PERM-000'));

CREATE POLICY "Assinatura visível pelo tenant" ON assinaturas_tenant FOR SELECT TO authenticated 
  USING (tenant_id = get_tenant_atual());
CREATE POLICY "Admin altera assinatura" ON assinaturas_tenant FOR ALL TO authenticated 
  USING (tenant_id = get_tenant_atual() AND has_perm('PERM-012'));

CREATE POLICY "Faturas visíveis pelo tenant" ON faturas FOR SELECT TO authenticated 
  USING (tenant_id = get_tenant_atual());

-- 7. Dados Iniciais (Planos)
INSERT INTO planos (nome, descricao, preco, features) VALUES
('Essencial', 'Ideal para profissionais autônomos', 89.90, '{"Agenda Inteligente", "Até 100 clientes", "Relatórios básicos"}'),
('Pro', 'O melhor custo-benefício para estúdios', 149.90, '{"Agenda Ilimitada", "Gestão de Estoque", "Financeiro Avançado", "Link de Agendamento"}'),
('Enterprise', 'Para grandes centros e franquias', 299.90, '{"Múltiplas Unidades", "API de Integração", "Suporte VIP 24h", "Dashboard Multi-tenant"}');