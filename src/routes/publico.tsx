import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { listarItens } from "@/lib/inventario";

export const Route = createFileRoute("/publico")({
  head: () => ({
    meta: [
      { title: "Inventário do almoxarifado — lista pública" },
      {
        name: "description",
        content: "Lista completa dos materiais do almoxarifado com fotos, quantidades e localização.",
      },
      { property: "og:title", content: "Inventário do almoxarifado — lista pública" },
      {
        property: "og:description",
        content: "Materiais do almoxarifado com fotos, quantidades e localização, atualizados em tempo real.",
      },
    ],
  }),
  component: Publico,
});

function Publico() {
  const { data: itens = [], isLoading } = useQuery({ queryKey: ["itens"], queryFn: listarItens });

  return (
    <div className="min-h-screen">
      <header className="topo-gradiente border-b border-border px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold uppercase">Inventário do almoxarifado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {itens.length} materiais cadastrados · atualizado em{" "}
            {new Date().toLocaleDateString("pt-BR")}
          </p>
          <Link to="/" className="mt-2 inline-block text-sm text-primary underline">
            Abrir o aplicativo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {itens.map((i) => (
              <article key={i.id} className="superficie flex gap-3 rounded-lg p-3">
                <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {i.fotoSrc ? (
                    <img
                      src={i.fotoSrc}
                      alt={i.nome}
                      loading="lazy"
                      width={160}
                      height={160}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageOff className="size-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold uppercase">{i.nome}</h2>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{i.descricao}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {i.quantidade} {i.unidade}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {i.localizacao ?? ""} {i.codigo ? `· ${i.codigo}` : ""}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
