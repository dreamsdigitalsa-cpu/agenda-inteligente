CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  codigo_interno TEXT,
  codigo_barras TEXT,
  
  -- Tipo: 'venda' (revenda), 'uso_interno' (consumível em serviços), 'misto'
  tipo TEXT NOT NULL DEFAULT 'venda',
  
  -- Custo médio (calculado automaticamente nas entradas)
  custo_medio NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,2),
  margem_lucro NUMERIC(5,2),  -- calculado
  
  -- Estoque
  estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) DEFAULT 0,
  unidade_medida TEXT DEFAULT 'un',  -- un, ml, g, kg, l
  
  -- Imagem
  foto_url TEXT,
  
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lotes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  numero_lote TEXT,
  quantidade NUMERIC(12,3) NOT NULL,
  custo_unitario NUMERIC(12,2) NOT NULL,
  data_compra DATE NOT NULL,
  data_validade DATE,
  fornecedor TEXT,
  nota_fiscal TEXT,
  
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES lotes_estoque(id) ON DELETE SET NULL,
  
  tipo TEXT NOT NULL,  -- 'entrada', 'saida_venda', 'saida_uso', 'ajuste', 'perda'
  quantidade NUMERIC(12,3) NOT NULL,
  motivo TEXT,
  
  -- Vínculo opcional
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  
  criado_por_usuario_id UUID NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Vínculo serviço → produtos consumidos
CREATE TABLE IF NOT EXISTS public.produtos_por_servico (
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade_padrao NUMERIC(12,3) NOT NULL,
  PRIMARY KEY (servico_id, produto_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_estoque_baixo ON produtos(tenant_id) 
  WHERE estoque_atual <= estoque_minimo;
CREATE INDEX IF NOT EXISTS idx_lotes_validade ON lotes_estoque(tenant_id, data_validade) 
  WHERE data_validade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes_estoque(produto_id, criado_em DESC);

-- RLS
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_por_servico ENABLE ROW LEVEL SECURITY;

-- Políticas (Simplificadas para tenant_id)
CREATE POLICY produtos_tenant ON produtos FOR ALL TO authenticated
  USING (tenant_id = get_tenant_atual())
  WITH CHECK (tenant_id = get_tenant_atual());

CREATE POLICY lotes_tenant ON lotes_estoque FOR ALL TO authenticated
  USING (tenant_id = get_tenant_atual())
  WITH CHECK (tenant_id = get_tenant_atual());

CREATE POLICY movimentacoes_tenant ON movimentacoes_estoque FOR ALL TO authenticated
  USING (tenant_id = get_tenant_atual())
  WITH CHECK (tenant_id = get_tenant_atual());

CREATE POLICY produtos_servico_tenant ON produtos_por_servico FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM servicos WHERE id = servico_id AND tenant_id = get_tenant_atual()))
  WITH CHECK (EXISTS (SELECT 1 FROM servicos WHERE id = servico_id AND tenant_id = get_tenant_atual()));

-- Trigger para atualizar estoque
CREATE OR REPLACE FUNCTION atualizar_estoque_apos_movimentacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE produtos
    SET estoque_atual = estoque_atual + NEW.quantidade,
        atualizado_em = now()
    WHERE id = NEW.produto_id;
  ELSE
    UPDATE produtos
    SET estoque_atual = estoque_atual - NEW.quantidade,
        atualizado_em = now()
    WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_atualizar_estoque
AFTER INSERT ON movimentacoes_estoque
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_apos_movimentacao();