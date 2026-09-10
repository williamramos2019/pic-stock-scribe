import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/inventario/planilha")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-auth.server")).preflight(),
      GET: async ({ request }) => {
        const { checarChave, json, corsHeaders } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        try {
          const url = new URL(request.url);
          const { carregarItens, filtrar } = await import("@/lib/api-inventario.server");
          const itens = filtrar(await carregarItens(), url);
          const situacaoTexto = (s: string) =>
            s === "sem_estoque" ? "Sem estoque" : s === "estoque_baixo" ? "Estoque baixo" : "Normal";

          const linhas = itens.map((i) => ({
            Codigo: i.codigo ?? "",
            Nome: i.nome,
            Descricao: i.descricao ?? "",
            Categoria: i.categoria ?? "",
            Quantidade: i.quantidade,
            Unidade: i.unidade,
            "Estoque minimo": i.estoque_minimo,
            Localizacao: i.localizacao ?? "",
            Situacao: situacaoTexto(i.situacao),
            Foto: i.foto ?? "",
            "Atualizado em": new Date(i.updated_at).toLocaleString("pt-BR"),
          }));

          const data = new Date().toISOString().slice(0, 10);

          if (url.searchParams.get("formato") === "csv") {
            const cabecalho = Object.keys(
              linhas[0] ?? { Codigo: "", Nome: "", Quantidade: 0 },
            );
            const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
            const csv = [
              cabecalho.join(";"),
              ...linhas.map((l) => cabecalho.map((c) => esc((l as Record<string, unknown>)[c])).join(";")),
            ].join("\n");
            return new Response("\uFEFF" + csv, {
              headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": `attachment; filename="inventario-${data}.csv"`,
                ...corsHeaders,
              },
            });
          }

          const XLSX = await import("xlsx");
          const ws = XLSX.utils.json_to_sheet(linhas);
          ws["!cols"] = [12, 40, 55, 14, 11, 8, 14, 16, 14, 45, 18].map((wch) => ({ wch }));
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
          const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
          return new Response(buffer, {
            headers: {
              "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "content-disposition": `attachment; filename="inventario-${data}.xlsx"`,
              ...corsHeaders,
            },
          });
        } catch (e) {
          return json({ erro: e instanceof Error ? e.message : "Falha ao gerar planilha" }, 500);
        }
      },
    },
  },
});
