import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/inventario/resumo")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-auth.server")).preflight(),
      GET: async ({ request }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        try {
          const { carregarItens, calcularResumo } = await import("@/lib/api-inventario.server");
          const itens = await carregarItens();
          const base = new URL(request.url).origin;
          return json({
            ...calcularResumo(itens),
            itens_estoque_baixo: itens
              .filter((i) => i.situacao === "estoque_baixo")
              .map((i) => ({ id: i.id, nome: i.nome, quantidade: i.quantidade, estoque_minimo: i.estoque_minimo })),
            itens_zerados: itens
              .filter((i) => i.situacao === "sem_estoque")
              .map((i) => ({ id: i.id, nome: i.nome, codigo: i.codigo, localizacao: i.localizacao })),
            link_publico: `${base}/publico`,
          });
        } catch (e) {
          return json({ erro: e instanceof Error ? e.message : "Falha ao carregar" }, 500);
        }
      },
    },
  },
});
