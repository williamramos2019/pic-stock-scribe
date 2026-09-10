import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const itemSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(2000).nullish(),
  categoria: z.string().max(100).nullish(),
  unidade: z.string().max(20).default("un"),
  codigo: z.string().max(60).nullish(),
  localizacao: z.string().max(120).nullish(),
  quantidade: z.number().int().min(0).max(1_000_000).default(0),
  estoque_minimo: z.number().int().min(0).max(1_000_000).default(0),
});

export const Route = createFileRoute("/api/public/inventario/itens")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-auth.server")).preflight(),
      GET: async ({ request }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        try {
          const { carregarItens, filtrar } = await import("@/lib/api-inventario.server");
          const url = new URL(request.url);
          const itens = filtrar(await carregarItens(), url);
          return json({ total: itens.length, itens });
        } catch (e) {
          return json({ erro: e instanceof Error ? e.message : "Falha ao carregar" }, 500);
        }
      },
      POST: async ({ request }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        try {
          const parsed = itemSchema.safeParse(await request.json());
          if (!parsed.success) return json({ erro: "Dados invalidos", detalhes: parsed.error.issues }, 400);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("itens")
            .insert(parsed.data as never)
            .select("*")
            .single();
          if (error) return json({ erro: error.message }, 400);
          return json({ item: data }, 201);
        } catch (e) {
          return json({ erro: e instanceof Error ? e.message : "Falha ao criar" }, 500);
        }
      },
    },
  },
});
