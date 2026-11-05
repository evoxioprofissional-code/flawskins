// Carregado com --import no processo do Next do sandbox.
// Bloqueia qualquer fetch que saia da máquina (NexusPag, Supabase real, etc.)
// e registra a tentativa. Assim o teste da carteira nunca toca produção.
const original = globalThis.fetch;
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

globalThis.fetch = async function guardedFetch(input, init) {
  let host = "";
  try {
    const url = typeof input === "string" || input instanceof URL ? new URL(String(input)) : new URL(input.url);
    host = url.hostname;
    if (!LOCAL.has(host)) {
      console.error(`[sandbox] BLOQUEADO: requisição externa para ${url.origin}${url.pathname}`);
      return new Response(JSON.stringify({ error: "sandbox: rede externa bloqueada" }), {
        status: 599,
        headers: { "content-type": "application/json" },
      });
    }
  } catch {
    // URL relativa / inválida: deixa o fetch original decidir.
  }
  return original(input, init);
};
