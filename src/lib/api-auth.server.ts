// Autenticação simples por chave de API para consumo externo (ex.: sistema PHP).
export type ApiOk = { ok: true };
export type ApiFail = { ok: false; response: Response };

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

export function checarChave(request: Request): ApiOk | ApiFail {
  const esperado = process.env["INVENTARIO_API_KEY"];
  if (!esperado) {
    return { ok: false, response: json({ erro: "API nao configurada" }, 503) };
  }
  const url = new URL(request.url);
  const header = request.headers.get("x-api-key");
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const enviado = header ?? bearer ?? url.searchParams.get("api_key");

  if (!enviado || enviado.length !== esperado.length) {
    return { ok: false, response: json({ erro: "Chave de API invalida" }, 401) };
  }
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) {
    diff |= esperado.charCodeAt(i) ^ enviado.charCodeAt(i);
  }
  if (diff !== 0) {
    return { ok: false, response: json({ erro: "Chave de API invalida" }, 401) };
  }
  return { ok: true };
}
