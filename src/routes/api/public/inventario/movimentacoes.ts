import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const movSchema = z.object({
  item_id: z.string().uuid(),
  tipo: z.enum(["entrada", "saida", "ajuste", "contagem"]),
  quantidade: z.number().int().min(-1_000_000).max(1_000_000),
  observacao: z.string().max(500).nullish(),
  aplicar_no_estoque: z.boolean().default(true),
});

export const Route = createFileRoute("/api/public/inventario/movimentacoes")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-auth.server")).preflight(),
      GET: async ({ request }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        const url = new URL(request.url);
        const limite = Math.min(Number(url.searchParams.get("limite") ?? 200) || 200, 1000);
        const itemId = url.searchParams.get("item_id");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("movimentacoes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limite);
        if (itemId) q = q.eq("item_id", itemId);
        const { data, error } = await q;
        if (error) return json({ erro: error.message }, 400);
        return json({ total: data?.length ?? 0, movimentacoes: data ?? [] });
      },
      POST: async ({ request }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        const parsed = movSchema.safeParse(await request.json());
        if (!parsed.success) return json({ erro: "Dados invalidos", detalhes: parsed.error.issues }, 400);
        const { item_id, tipo, quantidade, observacao, aplicar_no_estoque } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: item, error: erroItem } = await supabaseAdmin
          .from("itens")
          .select("id, quantidade")
          .eq("id", item_id)
          .maybeSingle();
        if (erroItem) return json({ erro: erroItem.message }, 400);
        if (!item) return json({ erro: "Item nao encontrado" }, 404);

        const { error } = await supabaseAdmin
          .from("movimentacoes")
          .insert({ item_id, tipo, quantidade, observacao: observacao ?? null } as never);
        if (error) return json({ erro: error.message }, 400);

        let novaQuantidade = item.quantidade;
        if (aplicar_no_estoque) {
          novaQuantidade =
            tipo === "entrada"
              ? item.quantidade + Math.abs(quantidade)
              : tipo === "saida"
                ? Math.max(0, item.quantidade - Math.abs(quantidade))
                : Math.max(0, quantidade);
          const { error: erroUp } = await supabaseAdmin
            .from("itens")
            .update({ quantidade: novaQuantidade, updated_at: new Date().toISOString() } as never)
            .eq("id", item_id);
          if (erroUp) return json({ erro: erroUp.message }, 400);
        }
        return json({ ok: true, item_id, quantidade_atual: novaQuantidade }, 201);
      },
    },
  },
});
