import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const BUCKET = "fotos-materiais";

export type ItemApi = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  unidade: string;
  codigo: string | null;
  localizacao: string | null;
  quantidade: number;
  estoque_minimo: number;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
  foto: string | null;
  situacao: "sem_estoque" | "estoque_baixo" | "normal";
};

export async function carregarItens(): Promise<ItemApi[]> {
  const { data, error } = await supabaseAdmin
    .from("itens")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const itens = data ?? [];
  const paths = itens.map((i) => i.foto_url).filter((p): p is string => !!p);
  const mapa = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(paths, 60 * 60 * 24 * 7);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) mapa.set(s.path, s.signedUrl);
    }
  }

  return itens.map((i) => ({
    ...i,
    foto: i.foto_url ? (mapa.get(i.foto_url) ?? null) : null,
    situacao:
      i.quantidade <= 0
        ? ("sem_estoque" as const)
        : i.quantidade <= i.estoque_minimo
          ? ("estoque_baixo" as const)
          : ("normal" as const),
  }));
}

export function calcularResumo(itens: ItemApi[]) {
  return {
    total_itens: itens.length,
    total_pecas: itens.reduce((s, i) => s + i.quantidade, 0),
    estoque_baixo: itens.filter((i) => i.situacao === "estoque_baixo").length,
    zerados: itens.filter((i) => i.situacao === "sem_estoque").length,
    categorias: Object.entries(
      itens.reduce<Record<string, number>>((acc, i) => {
        const c = i.categoria ?? "Sem categoria";
        acc[c] = (acc[c] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([categoria, quantidade]) => ({ categoria, quantidade })),
    atualizado_em: new Date().toISOString(),
  };
}

export function filtrar(itens: ItemApi[], url: URL): ItemApi[] {
  const busca = url.searchParams.get("busca")?.toLowerCase().trim();
  const categoria = url.searchParams.get("categoria");
  const situacao = url.searchParams.get("situacao");
  return itens.filter((i) => {
    if (categoria && i.categoria !== categoria) return false;
    if (situacao && i.situacao !== situacao) return false;
    if (busca) {
      const alvo = `${i.nome} ${i.descricao ?? ""} ${i.codigo ?? ""} ${i.localizacao ?? ""}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}
