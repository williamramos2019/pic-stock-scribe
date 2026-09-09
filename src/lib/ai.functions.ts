import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/jpeg"),
  dica: z.string().optional(),
});

export type AnaliseMaterial = {
  nome: string;
  descricao: string;
  categoria: string;
  unidade: string;
  codigo: string;
  confianca: number;
  similares: string[];
};

const SYSTEM = `Você é um especialista em catalogação de materiais de almoxarifado (construção civil, elétrica, hidráulica, EPI, ferramentas, manutenção industrial).
Analise a foto do material e responda SOMENTE em JSON válido com as chaves:
{"nome": string, "descricao": string, "categoria": string, "unidade": string, "codigo": string, "confianca": number, "similares": string[]}
Regras de padronização:
- "nome": nome técnico curto no padrão de catálogo, MAIÚSCULAS, formato "TIPO + ESPECIFICAÇÃO + MEDIDA" (ex.: "PARAFUSO SEXTAVADO AÇO ZINCADO 1/2\\" X 2\\"").
- "descricao": 1 a 2 frases objetivas com material, medidas visíveis, cor, aplicação típica.
- "categoria": uma entre Elétrica, Hidráulica, Fixação, Ferramentas, EPI, Construção, Pintura, Limpeza, Escritório, Mecânica, Outros.
- "unidade": un, pc, cx, m, kg, L, par, rolo ou pct.
- "codigo": código interno sugerido no formato "XXX-0000" usando 3 letras da categoria e 4 dígitos.
- "confianca": 0 a 100.
- "similares": até 3 nomes de produtos comerciais semelhantes que existem no mercado.
Escreva sempre em português do Brasil. Não invente medidas que não são visíveis; se não souber, omita a medida.`;

export const analisarFoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<AnaliseMaterial> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A inteligência artificial não está configurada.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Identifique este material de almoxarifado e devolva o JSON." +
                  (data.dica ? ` Observação do usuário: ${data.dica}` : ""),
              },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Muitas análises seguidas. Aguarde alguns segundos e tente de novo.");
      if (res.status === 402) throw new Error("Os créditos de IA acabaram. Adicione créditos para continuar analisando fotos.");
      throw new Error(`Não consegui analisar a foto (${res.status}). ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
    return {
      nome: str(parsed["nome"], "MATERIAL NÃO IDENTIFICADO").toUpperCase(),
      descricao: str(parsed["descricao"], "Descrição não gerada. Complete manualmente."),
      categoria: str(parsed["categoria"], "Outros"),
      unidade: str(parsed["unidade"], "un"),
      codigo: str(parsed["codigo"], ""),
      confianca: typeof parsed["confianca"] === "number" ? Math.max(0, Math.min(100, parsed["confianca"])) : 0,
      similares: Array.isArray(parsed["similares"])
        ? (parsed["similares"] as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
        : [],
    };
  });
