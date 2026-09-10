import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const patchSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  descricao: z.string().max(2000).nullish(),
  categoria: z.string().max(100).nullish(),
  unidade: z.string().max(20).optional(),
  codigo: z.string().max(60).nullish(),
  localizacao: z.string().max(120).nullish(),
  quantidade: z.number().int().min(0).max(1_000_000).optional(),
  estoque_minimo: z.number().int().min(0).max(1_000_000).optional(),
});

export const Route = createFileRoute("/api/public/inventario/itens/$id")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/lib/api-auth.server")).preflight(),
      GET: async ({ request, params }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        const { carregarItens } = await import("@/lib/api-inventario.server");
        const item = (await carregarItens()).find((i) => i.id === params.id);
        return item ? json({ item }) : json({ erro: "Item nao encontrado" }, 404);
      },
      PATCH: async ({ request, params }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        const parsed = patchSchema.safeParse(await request.json());
        if (!parsed.success) return json({ erro: "Dados invalidos", detalhes: parsed.error.issues }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("itens")
          .update({ ...parsed.data, updated_at: new Date().toISOString() } as never)
          .eq("id", params.id)
          .select("*")
          .maybeSingle();
        if (error) return json({ erro: error.message }, 400);
        return data ? json({ item: data }) : json({ erro: "Item nao encontrado" }, 404);
      },
      DELETE: async ({ request, params }) => {
        const { checarChave, json } = await import("@/lib/api-auth.server");
        const auth = checarChave(request);
        if (!auth.ok) return auth.response;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("itens").delete().eq("id", params.id);
        if (error) return json({ erro: error.message }, 400);
        return json({ ok: true });
      },
    },
  },
});
