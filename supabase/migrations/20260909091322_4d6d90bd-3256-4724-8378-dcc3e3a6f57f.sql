CREATE TABLE public.itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT 'Item sem nome',
  descricao TEXT,
  categoria TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  codigo TEXT,
  localizacao TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;

ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventario aberto para leitura" ON public.itens FOR SELECT USING (true);
CREATE POLICY "Inventario aberto para insercao" ON public.itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Inventario aberto para atualizacao" ON public.itens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Inventario aberto para exclusao" ON public.itens FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_itens_updated_at BEFORE UPDATE ON public.itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.itens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'ajuste',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movimentacoes leitura aberta" ON public.movimentacoes FOR SELECT USING (true);
CREATE POLICY "Movimentacoes insercao aberta" ON public.movimentacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Movimentacoes atualizacao aberta" ON public.movimentacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Movimentacoes exclusao aberta" ON public.movimentacoes FOR DELETE USING (true);