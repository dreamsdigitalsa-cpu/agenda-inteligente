ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Criar um trigger para gerar slug se não existir (opcional, mas bom para automação)
CREATE OR REPLACE FUNCTION public.gerar_slug_profissional()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.nome, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Garante que não termine em hífen
    NEW.slug := trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_slug_profissional ON public.profissionais;
CREATE TRIGGER trg_gerar_slug_profissional
BEFORE INSERT OR UPDATE ON public.profissionais
FOR EACH ROW EXECUTE FUNCTION public.gerar_slug_profissional();

-- Atualizar profissionais existentes
UPDATE public.profissionais SET slug = lower(regexp_replace(nome, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
UPDATE public.profissionais SET slug = trim(both '-' from slug);
