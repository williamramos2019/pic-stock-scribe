import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { ItemComFoto } from "./inventario";

async function urlParaDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportarPdf(itens: ItemComFoto[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const larguraPagina = 210;
  const margem = 12;
  let y = margem;

  doc.setFontSize(18);
  doc.text("Inventário do Almoxarifado", margem, y + 4);
  doc.setFontSize(10);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} — ${itens.length} itens`,
    margem,
    y + 11,
  );
  y += 20;

  for (const item of itens) {
    if (y > 245) {
      doc.addPage();
      y = margem;
    }
    const alturaCartao = 42;
    doc.setDrawColor(200);
    doc.roundedRect(margem, y, larguraPagina - margem * 2, alturaCartao, 2, 2);

    if (item.fotoSrc) {
      const dataUrl = await urlParaDataUrl(item.fotoSrc);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, "JPEG", margem + 3, y + 3, 36, 36, undefined, "FAST");
        } catch {
          /* imagem inválida, segue sem foto */
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
      `Qtd: ${item.quantidade} ${item.unidade}   •   Cat.: ${item.categoria ?? "-"}   •   Cód.: ${item.codigo ?? "-"}   •   Local: ${item.localizacao ?? "-"}`,
      x,
      y + 36,
    );

    y += alturaCartao + 5;
  }

  doc.save(`inventario-almoxarifado-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportarPlanilha(itens: ItemComFoto[]) {
  const linhas = itens.map((i) => ({
    Código: i.codigo ?? "",
    Nome: i.nome,
    Descrição: i.descricao ?? "",
    Categoria: i.categoria ?? "",
    Quantidade: i.quantidade,
    Unidade: i.unidade,
    "Estoque mínimo": i.estoque_minimo,
    Localização: i.localizacao ?? "",
    Situação:
      i.quantidade <= 0 ? "Sem estoque" : i.quantidade <= i.estoque_minimo ? "Estoque baixo" : "Normal",
    Foto: i.fotoSrc ?? "",
    "Atualizado em": new Date(i.updated_at).toLocaleString("pt-BR"),
  }));
  const ws = XLSX.utils.json_to_sheet(linhas);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 55 },
    { wch: 14 },
    { wch: 11 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 45 },
    { wch: 18 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventário");
  XLSX.writeFile(wb, `inventario-almoxarifado-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
