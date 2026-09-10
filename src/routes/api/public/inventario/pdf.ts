import { createFileRoute } from "@tanstack/react-router";

async function baixarComoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
    return `data:image/jpeg;base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/inventario/pdf")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-auth.server")).preflight(),
      GET: async ({ request }) => {
        const { checarChave, json, corsHeaders } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        try {
          const url = new URL(request.url);
          const semFotos = url.searchParams.get("fotos") === "0";
          const { carregarItens, filtrar } = await import("@/lib/api-inventario.server");
          const itens = filtrar(await carregarItens(), url);

          const mod = await import("jspdf");
          const jsPDF = (mod as any).jsPDF ?? mod.default;
          const doc = new jsPDF({ unit: "mm", format: "a4" });
          const largura = 210;
          const margem = 12;
          let y = margem;

          doc.setFontSize(18);
          doc.text("Inventario do Almoxarifado", margem, y + 4);
          doc.setFontSize(10);
          doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} - ${itens.length} itens`, margem, y + 11);
          y += 20;

          for (const item of itens) {
            if (y > 245) {
              doc.addPage();
              y = margem;
            }
            const altura = 42;
            doc.setDrawColor(200);
            doc.roundedRect(margem, y, largura - margem * 2, altura, 2, 2);

            if (!semFotos && item.foto) {
              const dataUrl = await baixarComoDataUrl(item.foto);
              if (dataUrl) {
                try {
                  doc.addImage(dataUrl, "JPEG", margem + 3, y + 3, 36, 36, undefined, "FAST");
                } catch {
                  /* foto invalida */
                }
              }
            }

            const x = margem + 44;
            doc.setFontSize(12);
            doc.text(doc.splitTextToSize(item.nome, 140).slice(0, 1), x, y + 9);
            doc.setFontSize(9);
            doc.setTextColor(90);
            doc.text(doc.splitTextToSize(item.descricao ?? "", 140).slice(0, 3), x, y + 15);
            doc.setTextColor(0);
            doc.setFontSize(10);
            doc.text(
              `Qtd: ${item.quantidade} ${item.unidade}  -  Cat.: ${item.categoria ?? "-"}  -  Cod.: ${item.codigo ?? "-"}  -  Local: ${item.localizacao ?? "-"}`,
              x,
              y + 36,
            );
            y += altura + 5;
          }

          const bytes = doc.output("arraybuffer");
          return new Response(bytes, {
            headers: {
              "content-type": "application/pdf",
              "content-disposition": `inline; filename="inventario-${new Date().toISOString().slice(0, 10)}.pdf"`,
              ...corsHeaders,
            },
          });
        } catch (e) {
          return json({ erro: e instanceof Error ? e.message : "Falha ao gerar PDF" }, 500);
        }
      },
    },
  },
});
