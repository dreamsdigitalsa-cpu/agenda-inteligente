-- 1. Tabela para log de notificações da fila
CREATE TABLE IF NOT EXISTS public.notificacoes_fila (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  registro_fila_id UUID NOT NULL REFERENCES fila_espera(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'aproximacao', 'chamada', 'checkin'
  status TEXT NOT NULL DEFAULT 'pendente',
  mensagem TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar campo de controle na fila_espera se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fila_espera' AND column_name='notificado_aproximacao') THEN
    ALTER TABLE public.fila_espera ADD COLUMN notificado_aproximacao BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fila_espera' AND column_name='atraso_minutos') THEN
    ALTER TABLE public.fila_espera ADD COLUMN atraso_minutos INTEGER DEFAULT 0;
  END IF;
END $$;

-- 3. Trigger para Notificação Automática de Aproximação
CREATE OR REPLACE FUNCTION fn_notificar_aproximacao_fila()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o cliente chegou na posição 3 ou menos, ainda não foi notificado e a fila está aguardando
  IF NEW.posicao <= 3 AND NEW.status = 'aguardando' AND (OLD.posicao > 3 OR OLD.posicao IS NULL) AND NEW.notificado_aproximacao = false THEN
    
    INSERT INTO notificacoes_fila (tenant_id, registro_fila_id, tipo, mensagem)
    VALUES (NEW.tenant_id, NEW.id, 'aproximacao', 
            'Olá ' || NEW.cliente_nome || ', faltam apenas ' || NEW.posicao || ' pessoas à sua frente. Está chegando a sua vez!');
    
    NEW.notificado_aproximacao := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_aproximacao_fila ON public.fila_espera;
CREATE TRIGGER trg_notificar_aproximacao_fila
BEFORE UPDATE OF posicao ON public.fila_espera
FOR EACH ROW EXECUTE FUNCTION fn_notificar_aproximacao_fila();

-- 4. RLS para acesso público (anon)
ALTER TABLE fila_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público leitura fila por slug" ON fila_espera
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenants t 
      WHERE t.id = tenant_id 
      AND t.status = 'ativo'
    )
  );
