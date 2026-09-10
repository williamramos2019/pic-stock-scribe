import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/inventario/")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        const base = new URL(request.url).origin;
        return json({
          api: "Inventario do almoxarifado",
          versao: 1,
          autenticacao: "envie o header x-api-key: SUA_CHAVE (ou Authorization: Bearer SUA_CHAVE)",
          endpoints: {
            resumo: `${base}/api/public/inventario/resumo`,
            itens: `${base}/api/public/inventario/itens?busca=&categoria=&situacao=normal|estoque_baixo|sem_estoque`,
            item: `${base}/api/public/inventario/itens/{id} (GET, PATCH, DELETE)`,
            criar_item: `POST ${base}/api/public/inventario/itens`,
            movimentacoes: `${base}/api/public/inventario/movimentacoes?item_id=&limite=200`,
            registrar_movimentacao: `POST ${base}/api/public/inventario/movimentacoes`,
            planilha_xlsx: `${base}/api/public/inventario/planilha`,
            planilha_csv: `${base}/api/public/inventario/planilha?formato=csv`,
            pdf_com_fotos: `${base}/api/public/inventario/pdf`,
            link_publico: `${base}/publico`,
          },
        });
      },
    },
  },
});
