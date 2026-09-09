import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "fotos-materiais";

export type Item = {
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
};

export type ItemComFoto = Item & { fotoSrc: string | null };

export const CATEGORIAS = [
  "Elétrica",
  "Hidráulica",
  "Fixação",
  "Ferramentas",
  "EPI",
  "Construção",
  "Pintura",
  "Limpeza",
  "Escritório",
  "Mecânica",
  "Outros",
];

export const UNIDADES = ["un", "pc", "cx", "m", "kg", "L", "par", "rolo", "pct"];

export async function assinarFoto(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

export async function listarItens(): Promise<ItemComFoto[]> {
  const { data, error } = await supabase
    .from("itens")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const itens = (data ?? []) as Item[];
  const paths = itens.map((i) => i.foto_url).filter((p): p is string => !!p);
  let mapa = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24);
    mapa = new Map(
      (signed ?? [])
        .filter((s) => !!s.signedUrl && !!s.path)
        .map((s) => [s.path as string, s.signedUrl as string]),
    );
  }
  return itens.map((i) => ({ ...i, fotoSrc: i.foto_url ? (mapa.get(i.foto_url) ?? null) : null }));
}

export async function enviarFoto(file: Blob, ext = "jpg"): Promise<string> {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function criarItem(item: Partial<Item>) {
  const { error } = await supabase.from("itens").insert(item as never);
  if (error) throw error;
}

export async function atualizarItem(id: string, patch: Partial<Item>) {
  const { error } = await supabase.from("itens").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function excluirItem(id: string) {
  const { error } = await supabase.from("itens").delete().eq("id", id);
  if (error) throw error;
}

export async function registrarMovimentacao(
  item_id: string,
  tipo: "entrada" | "saida" | "ajuste" | "contagem",
  quantidade: number,
  observacao?: string,
) {
  const { error } = await supabase
    .from("movimentacoes")
    .insert({ item_id, tipo, quantidade, observacao: observacao ?? null } as never);
  if (error) throw error;
}

export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function comprimirImagem(file: File, max = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob ?? file;
}
