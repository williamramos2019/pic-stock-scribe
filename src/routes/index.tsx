import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  Camera,
  FileDown,
  Link2,
  Loader2,
  Plus,
  Search,
  Sheet as SheetIcon,
  Sparkles,
  Boxes,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemCard } from "@/components/inventario/ItemCard";
import { ItemDialog, rascunhoDeItem, type Rascunho } from "@/components/inventario/ItemDialog";
import { analisarFoto } from "@/lib/ai.functions";
import {
  atualizarItem,
  comprimirImagem,
  criarItem,
  enviarFoto,
  excluirItem,
  fileToBase64,
  listarItens,
  registrarMovimentacao,
  CATEGORIAS,
  type ItemComFoto,
} from "@/lib/inventario";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventário do Almoxarifado — foto, IA e contagem" },
      {
        name: "description",
        content:
          "Fotografe o material, a IA identifica e padroniza a descrição, e você controla quantidades e exporta em PDF, planilha ou link.",
      },
      { property: "og:title", content: "Inventário do Almoxarifado com IA" },
      {
        property: "og:description",
        content:
          "Cadastro de materiais por foto, descrição padronizada por IA, contagem de estoque e exportação em PDF, planilha e link.",
      },
    ],
  }),
  component: Inventario,
});

const rascunhoVazio: Rascunho = {
  nome: "",
  descricao: "",
  categoria: "Outros",
  unidade: "un",
  codigo: "",
  localizacao: "",
  quantidade: 1,
  estoque_minimo: 0,
};

function Inventario() {
  const qc = useQueryClient();
  const analisar = useServerFn(analisarFoto);
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [analisando, setAnalisando] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<ItemComFoto | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>(rascunhoVazio);
  const [previa, setPrevia] = useState<string | null>(null);
  const [similares, setSimilares] = useState<string[]>([]);
  const [fotoPath, setFotoPath] = useState<string | null>(null);

  const { data: itens = [], isLoading } = useQuery({ queryKey: ["itens"], queryFn: listarItens });

  const recarregar = () => qc.invalidateQueries({ queryKey: ["itens"] });

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return itens.filter((i) => {
      const okCat = categoria === "todas" || i.categoria === categoria;
      const okBusca =
        !t ||
        [i.nome, i.descricao, i.codigo, i.localizacao].some((v) => (v ?? "").toLowerCase().includes(t));
      return okCat && okBusca;
    });
  }, [itens, busca, categoria]);

  const resumo = useMemo(() => {
    const total = itens.length;
    const pecas = itens.reduce((s, i) => s + Number(i.quantidade), 0);
    const baixos = itens.filter((i) => i.quantidade > 0 && i.quantidade <= i.estoque_minimo).length;
    const zerados = itens.filter((i) => i.quantidade <= 0).length;
    return { total, pecas, baixos, zerados };
  }, [itens]);

  async function aoEscolherFoto(file: File | undefined) {
    if (!file) return;
    setAnalisando(true);
    try {
      const comprimida = await comprimirImagem(file);
      setPrevia(URL.createObjectURL(comprimida));
      const [base64, path] = await Promise.all([
        fileToBase64(comprimida),
        enviarFoto(comprimida, "jpg"),
      ]);
      setFotoPath(path);
      const analise = await analisar({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
      setSimilares(analise.similares);
      setEditando(null);
      setRascunho({
        ...rascunhoVazio,
        nome: analise.nome,
        descricao: analise.descricao,
        categoria: CATEGORIAS.includes(analise.categoria) ? analise.categoria : "Outros",
        unidade: analise.unidade,
        codigo: analise.codigo,
      });
      setDialogo(true);
      toast.success(`Material identificado (${analise.confianca}% de certeza)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui analisar a foto.");
    } finally {
      setAnalisando(false);
      if (inputCamera.current) inputCamera.current.value = "";
      if (inputGaleria.current) inputGaleria.current.value = "";
    }
  }

  const salvar = useMutation({
    mutationFn: async (r: Rascunho) => {
      if (editando) {
        await atualizarItem(editando.id, r);
        if (Number(r.quantidade) !== Number(editando.quantidade)) {
          await registrarMovimentacao(
            editando.id,
            "ajuste",
            Number(r.quantidade) - Number(editando.quantidade),
            "Edição manual",
          );
        }
      } else {
        await criarItem({ ...r, foto_url: fotoPath });
      }
    },
    onSuccess: () => {
      toast.success("Item salvo no inventário.");
      setDialogo(false);
      setFotoPath(null);
      setPrevia(null);
      setSimilares([]);
      setEditando(null);
      recarregar();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  async function ajustar(item: ItemComFoto, delta: number) {
    const nova = Math.max(0, Number(item.quantidade) + delta);
    try {
      await atualizarItem(item.id, { quantidade: nova });
      await registrarMovimentacao(item.id, delta > 0 ? "entrada" : "saida", delta, "Contagem rápida");
      recarregar();
    } catch {
      toast.error("Não consegui atualizar a quantidade.");
    }
  }

  async function remover(item: ItemComFoto) {
    if (!confirm(`Excluir "${item.nome}" do inventário?`)) return;
    try {
      await excluirItem(item.id);
      toast.success("Item excluído.");
      recarregar();
    } catch {
      toast.error("Não consegui excluir o item.");
    }
  }

  const [exportando, setExportando] = useState<"pdf" | "xls" | null>(null);

  async function exportar(tipo: "pdf" | "xls") {
    setExportando(tipo);
    try {
      const mod = await import("@/lib/exportar");
      if (tipo === "pdf") await mod.exportarPdf(filtrados);
      else mod.exportarPlanilha(filtrados);
      toast.success(tipo === "pdf" ? "PDF gerado com as fotos." : "Planilha gerada.");
    } catch {
      toast.error("Não consegui gerar o arquivo.");
    } finally {
      setExportando(null);
    }
  }

  async function copiarLink() {
    const url = `${window.location.origin}/publico`;
    try {
      if (navigator.share) await navigator.share({ title: "Inventário do Almoxarifado", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado para compartilhar.");
      }
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="topo-gradiente border-b border-border px-4 pb-4 pt-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold uppercase tracking-wide">Inventário do Almoxarifado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fotografe o material: a IA identifica e padroniza nome e descrição.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Resumo titulo="Itens" valor={resumo.total} icone={<Boxes className="size-4" />} />
            <Resumo titulo="Peças" valor={resumo.pecas} icone={<Sparkles className="size-4" />} />
            <Resumo
              titulo="Estoque baixo"
              valor={resumo.baixos}
              icone={<TriangleAlert className="size-4 text-warning" />}
            />
            <Resumo
              titulo="Zerados"
              valor={resumo.zerados}
              icone={<TriangleAlert className="size-4 text-destructive" />}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={!filtrados.length || !!exportando} onClick={() => exportar("pdf")}>
              {exportando === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
              PDF com fotos
            </Button>
            <Button size="sm" variant="secondary" disabled={!filtrados.length || !!exportando} onClick={() => exportar("xls")}>
              <SheetIcon className="size-4" />
              Planilha
            </Button>
            <Button size="sm" variant="secondary" onClick={copiarLink}>
              <Link2 className="size-4" />
              Link para compartilhar
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/publico">Ver página pública</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar material, código ou prateleira"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando inventário...</p>
          ) : filtrados.length === 0 ? (
            <div className="superficie rounded-lg p-8 text-center">
              <Camera className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum material ainda. Toque em <strong>Fotografar material</strong> para começar.
              </p>
            </div>
          ) : (
            filtrados.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAjustar={ajustar}
                onEditar={(i) => {
                  setEditando(i);
                  setPrevia(i.fotoSrc);
                  setSimilares([]);
                  setRascunho(rascunhoDeItem(i));
                  setDialogo(true);
                }}
                onExcluir={remover}
              />
            ))
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button className="flex-1" disabled={analisando} onClick={() => inputCamera.current?.click()}>
            {analisando ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {analisando ? "Analisando foto..." : "Fotografar material"}
          </Button>
          <Button variant="secondary" disabled={analisando} onClick={() => inputGaleria.current?.click()}>
            <Sparkles className="size-4" />
            Galeria
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setEditando(null);
              setPrevia(null);
              setFotoPath(null);
              setSimilares([]);
              setRascunho(rascunhoVazio);
              setDialogo(true);
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <input
        ref={inputCamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => aoEscolherFoto(e.target.files?.[0])}
      />
      <input
        ref={inputGaleria}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => aoEscolherFoto(e.target.files?.[0])}
      />

      <ItemDialog
        aberto={dialogo}
        titulo={editando ? "Editar material" : "Novo material"}
        inicial={rascunho}
        previa={previa}
        similares={similares}
        salvando={salvar.isPending}
        onFechar={() => setDialogo(false)}
        onSalvar={(r) => salvar.mutate(r)}
      />
    </div>
  );
}

function Resumo({ titulo, valor, icone }: { titulo: string; valor: number; icone: React.ReactNode }) {
  return (
    <div className="superficie rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase text-muted-foreground">
        {icone}
        {titulo}
      </div>
      <div className="text-xl font-bold tabular-nums">{valor}</div>
    </div>
  );
}
