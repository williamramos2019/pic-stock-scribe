import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIAS, UNIDADES, type ItemComFoto } from "@/lib/inventario";

export type Rascunho = {
  nome: string;
  descricao: string;
  categoria: string;
  unidade: string;
  codigo: string;
  localizacao: string;
  quantidade: number;
  estoque_minimo: number;
};

type Props = {
  aberto: boolean;
  titulo: string;
  inicial: Rascunho;
  previa?: string | null;
  similares?: string[];
  salvando?: boolean;
  onFechar: () => void;
  onSalvar: (r: Rascunho) => void;
};

export const rascunhoDeItem = (i: ItemComFoto): Rascunho => ({
  nome: i.nome,
  descricao: i.descricao ?? "",
  categoria: i.categoria ?? "Outros",
  unidade: i.unidade,
  codigo: i.codigo ?? "",
  localizacao: i.localizacao ?? "",
  quantidade: Number(i.quantidade),
  estoque_minimo: Number(i.estoque_minimo),
});

export function ItemDialog({
  aberto,
  titulo,
  inicial,
  previa,
  similares,
  salvando,
  onFechar,
  onSalvar,
}: Props) {
  const [form, setForm] = useState<Rascunho>(inicial);
  useEffect(() => {
    if (aberto) setForm(inicial);
  }, [aberto, inicial]);

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        {previa ? (
          <img
            src={previa}
            alt="Foto do material"
            className="h-44 w-full rounded-md object-cover"
            width={640}
            height={360}
          />
        ) : null}

        {similares?.length ? (
          <p className="text-xs text-muted-foreground">
            Produtos semelhantes encontrados: {similares.join(" • ")}
          </p>
        ) : null}

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome padronizado</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value.toUpperCase())} />
          </div>
          <div className="grid gap-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={(v) => set("unidade", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Quantidade</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.quantidade}
                onChange={(e) => set("quantidade", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Estoque mínimo</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.estoque_minimo}
                onChange={(e) => set("estoque_minimo", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Código</Label>
              <Input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Localização</Label>
              <Input
                placeholder="Ex.: Prateleira A3"
                value={form.localizacao}
                onChange={(e) => set("localizacao", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button disabled={salvando || !form.nome.trim()} onClick={() => onSalvar(form)}>
            {salvando ? "Salvando..." : "Salvar item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
