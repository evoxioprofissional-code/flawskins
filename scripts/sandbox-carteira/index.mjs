// Sandbox da carteira e dos saques — 100% local, dados simulados.
//
//   npm run sandbox:carteira
//
// Sobe:
//   - um Supabase FALSO em http://localhost:54329 (auth + as tabelas/funções
//     da carteira, com as mesmas regras da migration 0027);
//   - o site em http://localhost:3200, apontado só para esse Supabase falso,
//     sem nenhuma chave real e com NEXUSPAG_WITHDRAW_ENABLED=false.
// Toda requisição para fora da máquina é bloqueada (fetch-guard.mjs).
//
// Painel do sandbox: http://localhost:54329/__sandbox
// (entrar como usuário/admin, resetar dados, ver o estado e o log de chamadas)
//
// Requer que o `npm run dev` normal esteja parado (o Next permite um dev
// server por pasta).
import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const PORTA_MOCK = 54329;
const PORTA_SITE = Number(process.env.SANDBOX_PORT || 3200);
const SITE = `http://localhost:${PORTA_SITE}`;
const SUPABASE = `http://localhost:${PORTA_MOCK}`;

// O admin do painel é definido por email no código (src/lib/admin.ts).
const ADMIN_EMAIL = /ADMIN_EMAIL\s*=\s*"([^"]+)"/.exec(readFileSync(join(RAIZ, "src/lib/admin.ts"), "utf8"))?.[1];
if (!ADMIN_EMAIL) throw new Error("não achei ADMIN_EMAIL em src/lib/admin.ts");

const LIMITES = { minimo: 10, maximo: 1000, diario: 2000 }; // = app_config da 0027
const USUARIOS = {
  usuario: { id: "00000000-0000-4000-8000-0000000000aa", email: "usuario@sandbox.test", nome: "Usuário Sandbox" },
  admin: { id: "00000000-0000-4000-8000-0000000000bb", email: ADMIN_EMAIL, nome: "Admin Sandbox" },
  outro: { id: "00000000-0000-4000-8000-0000000000cc", email: "outro@sandbox.test", nome: "Outro Usuário" },
};

// ---------------- estado simulado ----------------

let db;
const log = [];
function registrar(linha) {
  const l = `${new Date().toISOString().slice(11, 19)} ${linha}`;
  log.push(l);
  if (log.length > 300) log.shift();
  console.log(`[mock] ${linha}`);
}

function reset() {
  const agora = Date.now();
  const iso = (min) => new Date(agora - min * 60_000).toISOString();
  const u = USUARIOS.usuario.id;
  const o = USUARIOS.outro.id;
  const saque = (x) => ({
    pix_key_type: "email", motivo: null, precisa_revisao: false, provider_withdrawal_id: null, provider_status: null,
    processado_em: null, correlation_id: `cs-saque-${randomUUID()}`, ...x,
  });
  db = {
    chamadasDeEnvio: 0, // RPCs de envio à NexusPag (devem ficar em 0 com ENABLED=false)
    movimentos: [
      { id: randomUUID(), user_id: u, tipo: "deposito", valor: 300, descricao: "Depósito via Pix", referencia: "dep-1", created_at: iso(4000) },
      { id: randomUUID(), user_id: u, tipo: "ganho_rifa", valor: 87.5, descricao: "Ganhos da rifa Karambit Doppler (simulado)", referencia: "rifa-1", created_at: iso(3000) },
      { id: randomUUID(), user_id: u, tipo: "saque", valor: -50, descricao: "Saque para chave Pix (email)", referencia: "s-hist-1", created_at: iso(2900) },
      { id: randomUUID(), user_id: u, tipo: "saque", valor: -20, descricao: "Saque para chave Pix (cpf)", referencia: "s-hist-2", created_at: iso(2000) },
      { id: randomUUID(), user_id: u, tipo: "estorno_saque", valor: 20, descricao: "Saque não realizado (valor devolvido)", referencia: "estorno:s-hist-2", created_at: iso(1990) },
      { id: randomUUID(), user_id: u, tipo: "compra_cota", valor: -15, descricao: "Cotas da rifa AK-47 Redline (3) (simulado)", referencia: "cota-1", created_at: iso(60) },
      { id: randomUUID(), user_id: o, tipo: "deposito", valor: 500, descricao: "Depósito via Pix", referencia: "dep-2", created_at: iso(5000) },
      { id: randomUUID(), user_id: o, tipo: "saque", valor: -120, descricao: "Saque para chave Pix (phone)", referencia: "s-outro-1", created_at: iso(30) },
    ],
    saques: [
      saque({ id: "s-hist-1", user_id: u, valor: 50, chave_pix: "usuario@sandbox.test", status: "completed", provider_status: "manual", created_at: iso(2900), processado_em: iso(2800) }),
      saque({ id: "s-hist-2", user_id: u, valor: 20, chave_pix: "52998224725", pix_key_type: "cpf", status: "failed", motivo: "Chave Pix inválida (simulado)", created_at: iso(2000), processado_em: iso(1990) }),
      // Simula um envio que deu timeout: fica processing + revisão, saldo reservado.
      saque({ id: "s-outro-1", user_id: o, valor: 120, chave_pix: "+5511987654321", pix_key_type: "phone", status: "processing", precisa_revisao: true,
        motivo: "Sem resposta da NexusPag (timeout). Saldo mantido reservado; conferir antes de qualquer ação. (simulado)",
        provider_withdrawal_id: null, created_at: iso(30) }),
    ],
  };
  // ids "s-hist-*" não são uuid; troca por uuid mantendo as referências.
  for (const s of db.saques) {
    const novo = randomUUID();
    for (const m of db.movimentos) {
      if (m.referencia === s.id) m.referencia = novo;
      if (m.referencia === `estorno:${s.id}`) m.referencia = `estorno:${novo}`;
    }
    s.id = novo;
  }
  registrar("dados simulados resetados");
}
reset();

const saldoDe = (uid) => Math.round(db.movimentos.filter((m) => m.user_id === uid).reduce((a, m) => a + m.valor, 0) * 100) / 100;
const brl = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inicioDoDiaSP = () => {
  const d = new Date(Date.now() - 3 * 3600_000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + 3 * 3600_000;
};

class ErroSql extends Error {}

// Mesmas validações/ordem de carteira_saque_solicitar (0027).
function solicitarSaque(uid, { p_valor, p_chave_pix, p_tipo }) {
  if (!uid) throw new ErroSql("login necessário");
  if (!["cpf", "cnpj", "email", "phone", "random"].includes(p_tipo)) throw new ErroSql("tipo de chave Pix inválido");
  const chave = String(p_chave_pix ?? "").trim();
  if (chave.length < 5 || chave.length > 140) throw new ErroSql("chave Pix inválida");
  const v = Math.round(Number(p_valor) * 100) / 100;
  if (!Number.isFinite(v) || v < LIMITES.minimo) throw new ErroSql(`o saque mínimo é R$ ${brl(LIMITES.minimo)}`);
  if (v > LIMITES.maximo) throw new ErroSql(`o saque máximo é R$ ${brl(LIMITES.maximo)} por pedido`);
  if (db.saques.some((s) => s.user_id === uid && ["pending", "processing"].includes(s.status))) throw new ErroSql("você já tem um saque em andamento");
  const hoje = db.saques
    .filter((s) => s.user_id === uid && s.status !== "failed" && Date.parse(s.created_at) >= inicioDoDiaSP())
    .reduce((a, s) => a + s.valor, 0);
  if (hoje + v > LIMITES.diario) throw new ErroSql(`limite diário de saque é R$ ${brl(LIMITES.diario)}`);
  if (saldoDe(uid) < v) throw new ErroSql("saldo insuficiente");
  const agora = new Date().toISOString();
  const s = {
    id: randomUUID(), user_id: uid, valor: v, chave_pix: chave, pix_key_type: p_tipo, status: "pending", motivo: null,
    precisa_revisao: false, provider_withdrawal_id: null, provider_status: null, processado_em: null,
    correlation_id: `cs-saque-${randomUUID()}`, created_at: agora,
  };
  db.saques.push(s);
  db.movimentos.push({ id: randomUUID(), user_id: uid, tipo: "saque", valor: -v, descricao: `Saque para chave Pix (${p_tipo})`, referencia: s.id, created_at: agora });
  registrar(`saque criado: R$ ${brl(v)} (${p_tipo}) → status pending; saldo agora R$ ${brl(saldoDe(uid))}`);
  return { id: s.id, correlation_id: s.correlation_id, valor: s.valor, status: s.status };
}

function falhar(s, motivo) {
  if (s.status === "failed") return "ja_falhou";
  if (s.status === "completed") return "conflito";
  s.status = "failed";
  s.motivo = motivo;
  s.processado_em = new Date().toISOString();
  db.movimentos.push({ id: randomUUID(), user_id: s.user_id, tipo: "estorno_saque", valor: s.valor, descricao: "Saque não realizado (valor devolvido)", referencia: `estorno:${s.id}`, created_at: s.processado_em });
  return "falhou";
}

function adminProcessar(user, { p_saque, p_aprovar, p_motivo }) {
  if (user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) throw new ErroSql("não autorizado");
  const s = db.saques.find((x) => x.id === p_saque);
  if (!s) throw new ErroSql("saque não encontrado");
  if (s.status !== "pending" || s.provider_withdrawal_id) throw new ErroSql("só saques na fila (não enviados à NexusPag) podem ser processados manualmente");
  if (p_aprovar) {
    Object.assign(s, { status: "completed", processado_em: new Date().toISOString(), provider_status: "manual" });
    registrar(`admin marcou como pago (manual): R$ ${brl(s.valor)}`);
  } else {
    falhar(s, String(p_motivo ?? "").trim() || "Recusado pela equipe");
    registrar(`admin recusou: R$ ${brl(s.valor)} devolvido; saldo do usuário R$ ${brl(saldoDe(s.user_id))}`);
  }
  return null;
}

// ---------------- auth falso ----------------

const b64url = (s) => Buffer.from(s).toString("base64url");
function tokenDe(chave) {
  const u = USUARIOS[chave];
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  const jwt = [b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })), b64url(JSON.stringify({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", exp })), b64url("sandbox")].join(".");
  return { jwt, exp, u };
}
const userObj = (u) => ({
  id: u.id, aud: "authenticated", role: "authenticated", email: u.email, user_metadata: { nome: u.nome }, app_metadata: { provider: "email" },
  created_at: "2026-01-01T00:00:00Z",
});
function usuarioDoRequest(req) {
  const auth = req.headers.authorization ?? "";
  const tok = auth.replace(/^Bearer\s+/i, "");
  try {
    const sub = JSON.parse(Buffer.from(tok.split(".")[1] ?? "", "base64url").toString()).sub;
    return Object.values(USUARIOS).find((u) => u.id === sub) ?? null;
  } catch {
    return null;
  }
}
function cookieDeSessao(chave) {
  const { jwt, exp, u } = tokenDe(chave);
  const sessao = { access_token: jwt, token_type: "bearer", expires_in: exp - Math.floor(Date.now() / 1000), expires_at: exp, refresh_token: `sandbox-${chave}`, user: userObj(u) };
  return `sb-localhost-auth-token=base64-${b64url(JSON.stringify(sessao))}; Path=/; SameSite=Lax; Max-Age=2592000`;
}

// ---------------- PostgREST mínimo ----------------

function filtrar(linhas, params) {
  let out = [...linhas];
  for (const [col, expr] of params) {
    if (["select", "order", "limit", "offset"].includes(col)) continue;
    if (col === "or") {
      // só o filtro usado pelo admin: (status.in.(pending,processing),precisa_revisao.eq.true)
      out = out.filter((r) => ["pending", "processing"].includes(r.status) || r.precisa_revisao === true);
      continue;
    }
    const [op, ...resto] = expr.split(".");
    const val = resto.join(".");
    if (op === "eq") out = out.filter((r) => String(r[col]) === val);
    else if (op === "in") {
      const lista = val.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      out = out.filter((r) => lista.includes(String(r[col])));
    }
  }
  const ordem = params.get("order");
  if (ordem) {
    const [col, dir] = ordem.split(".");
    out.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const lim = Number(params.get("limit"));
  return lim ? out.slice(0, lim) : out;
}

const PERFIS = () => Object.values(USUARIOS).map((u) => ({ id: u.id, nome: u.nome, avatar_url: null, steam_trade_url: null }));

function paginaSandbox() {
  const linhas = db.saques
    .map((s) => `<tr><td>${Object.values(USUARIOS).find((u) => u.id === s.user_id)?.nome}</td><td>R$ ${brl(s.valor)}</td><td>${s.pix_key_type}</td><td>${s.status}${s.precisa_revisao ? " + revisão" : ""}</td><td>${s.created_at.slice(0, 19).replace("T", " ")}</td></tr>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>Sandbox da carteira</title>
<style>body{font:14px system-ui;background:#0b0d12;color:#e5e7eb;max-width:860px;margin:32px auto;padding:0 16px}a.b{display:inline-block;margin:4px 8px 4px 0;padding:8px 14px;border-radius:8px;background:#1f2937;color:#fff;text-decoration:none}a.b:hover{background:#374151}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border-bottom:1px solid #1f2937;padding:6px;text-align:left}pre{background:#111827;padding:12px;border-radius:8px;max-height:280px;overflow:auto;font-size:12px}.ok{color:#34d399}.no{color:#f87171}</style>
<h1>Sandbox da carteira (dados simulados)</h1>
<p>Supabase falso em ${SUPABASE} · site em <a href="${SITE}/carteira" style="color:#93c5fd">${SITE}</a> · nada aqui toca produção.</p>
<p><a class="b" href="/__sandbox/login?as=usuario">Entrar como usuário</a><a class="b" href="/__sandbox/login?as=admin">Entrar como admin</a><a class="b" href="/__sandbox/logout">Sair</a><a class="b" href="/__sandbox/reset">Resetar dados</a></p>
<p>Saldo do usuário: <b>R$ ${brl(saldoDe(USUARIOS.usuario.id))}</b> · Outro usuário: R$ ${brl(saldoDe(USUARIOS.outro.id))}</p>
<p>Chamadas de envio à NexusPag (devem ser 0): <b class="${db.chamadasDeEnvio ? "no" : "ok"}">${db.chamadasDeEnvio}</b></p>
<table><tr><th>Usuário</th><th>Valor</th><th>Tipo</th><th>Status</th><th>Criado (UTC)</th></tr>${linhas}</table>
<h3>Log</h3><pre>${log.slice(-60).join("\n")}</pre>`;
}

const ENVIO = new Set(["carteira_saque_reivindicar_envio", "carteira_saque_registrar_envio", "carteira_saque_estornar_diferenca", "carteira_saque_concluir", "carteira_saque_falhar", "carteira_saque_marcar_revisao"]);

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, SUPABASE);
  const p = url.pathname;
  const cors = {
    "access-control-allow-origin": req.headers.origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  };
  const json = (code, data) => { res.writeHead(code, { "content-type": "application/json", ...cors }); res.end(data === undefined ? "" : JSON.stringify(data)); };
  const erro = (msg, code = "P0001", http = 400) => json(http, { code, message: msg, details: null, hint: null });
  if (req.method === "OPTIONS") return json(204);

  let corpo = "";
  for await (const c of req) corpo += c;
  const body = corpo ? JSON.parse(corpo) : {};
  const user = usuarioDoRequest(req);

  // painel
  if (p === "/__sandbox" || p === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(paginaSandbox()); }
  if (p === "/__sandbox/login") {
    const as = USUARIOS[url.searchParams.get("as")] && url.searchParams.get("as") !== "outro" ? url.searchParams.get("as") : "usuario";
    registrar(`login no sandbox como ${as}`);
    res.writeHead(302, { "set-cookie": cookieDeSessao(as), location: `${SITE}${as === "admin" ? "/admin" : "/carteira"}` });
    return res.end();
  }
  if (p === "/__sandbox/logout") {
    res.writeHead(302, { "set-cookie": "sb-localhost-auth-token=; Path=/; Max-Age=0", location: "/__sandbox" });
    return res.end();
  }
  if (p === "/__sandbox/reset") { reset(); res.writeHead(302, { location: "/__sandbox" }); return res.end(); }
  if (p === "/__sandbox/estado") return json(200, { ...db, saldos: Object.fromEntries(Object.entries(USUARIOS).map(([k, u]) => [k, saldoDe(u.id)])), log });

  // auth
  if (p === "/auth/v1/user") return user ? json(200, userObj(user)) : json(401, { code: 401, msg: "invalid JWT" });
  if (p === "/auth/v1/logout") return json(204);
  if (p.startsWith("/auth/v1/")) return json(400, { error: "sandbox: não suportado" });

  // rpc
  const rpc = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(p)?.[1];
  if (rpc) {
    try {
      if (rpc === "carteira_resumo") return user ? json(200, { saldo: saldoDe(user.id), a_receber: user === USUARIOS.usuario ? 42.75 : 0 }) : json(200, null);
      if (rpc === "carteira_saque_solicitar") return json(200, solicitarSaque(user?.id, body));
      if (rpc === "carteira_admin_processar_saque") { adminProcessar(user, body); return json(204); }
      if (rpc === "is_admin") return json(200, user?.email === ADMIN_EMAIL);
      // O painel admin precisa das métricas para renderizar; números fictícios.
      if (rpc === "admin_metrics") return json(200, { total_usuarios: 3, total_anuncios: 0, anuncios_ativos: 0, anuncios_vendidos: 0, valor_total_ativo: 0, usuarios_7d: 3, anuncios_7d: 0, por_categoria: {} });
      if (rpc === "admin_users") return json(200, []);
      if (ENVIO.has(rpc)) {
        db.chamadasDeEnvio++;
        registrar(`ALERTA: chamada de envio ${rpc} — não deveria acontecer com NEXUSPAG_WITHDRAW_ENABLED=false`);
        return erro("sandbox: envio desabilitado", "42501", 403);
      }
      registrar(`rpc não simulada: ${rpc}`);
      return erro(`função ${rpc} não existe no sandbox`, "PGRST202", 404);
    } catch (e) {
      if (e instanceof ErroSql) { registrar(`rpc ${rpc} recusada: ${e.message}`); return erro(e.message); }
      throw e;
    }
  }

  // tabelas
  const tabela = /^\/rest\/v1\/([a-z_]+)$/.exec(p)?.[1];
  if (tabela && req.method === "GET") {
    const fonte =
      tabela === "carteira_saques" ? db.saques.filter((s) => user && (s.user_id === user.id || user.email === ADMIN_EMAIL)) :
      tabela === "carteira_movimentos" ? db.movimentos.filter((m) => user && m.user_id === user.id) :
      tabela === "profiles" ? PERFIS() : [];
    const linhas = filtrar(fonte, url.searchParams);
    const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
    if (single) return linhas.length === 1 ? json(200, linhas[0]) : linhas.length ? erro("várias linhas", "PGRST116", 406) : erro("0 linhas", "PGRST116", 406);
    return json(200, linhas);
  }
  if (tabela) { registrar(`escrita não simulada em ${tabela} (${req.method})`); return erro("sandbox: somente leitura", "42501", 403); }

  // storage e o resto
  return json(404, { message: "sandbox: não encontrado" });
});

servidor.listen(PORTA_MOCK, "127.0.0.1", () => {
  console.log(`[sandbox] Supabase falso em ${SUPABASE}  ·  painel: ${SUPABASE}/__sandbox`);

  // Variáveis do processo têm prioridade sobre o .env.local no Next, então
  // todas as credenciais reais ficam substituídas por valores falsos/vazios.
  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sandbox-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "sandbox-service-key",
    NEXT_PUBLIC_SITE_URL: SITE,
    NEXUSPAG_WITHDRAW_API_KEY: "",
    NEXUSPAG_WITHDRAW_SHOP_ID: "",
    NEXUSPAG_WITHDRAW_ENABLED: "false",
    NEXUSPAG_WEBHOOK_SECRET: "whsec_sandbox_local",
    PANDASCORE_TOKEN: "",
    ESPORTS_SYNC_SECRET: "sandbox",
    MERCADOPAGO_ACCESS_TOKEN: "",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${pathToFileURL(join(AQUI, "fetch-guard.mjs")).href}`.trim(),
  };
  const next = spawn(process.execPath, [join(RAIZ, "node_modules/next/dist/bin/next"), "dev", "-p", String(PORTA_SITE)], { cwd: RAIZ, env, stdio: "inherit" });
  console.log(`[sandbox] site em ${SITE} (NEXUSPAG_WITHDRAW_ENABLED=false, sem chaves reais, rede externa bloqueada)`);
  const parar = () => { next.kill(); servidor.close(); process.exit(0); };
  process.on("SIGINT", parar);
  process.on("SIGTERM", parar);
  next.on("exit", (c) => { console.log(`[sandbox] next saiu (${c})`); servidor.close(); process.exit(c ?? 0); });
});
