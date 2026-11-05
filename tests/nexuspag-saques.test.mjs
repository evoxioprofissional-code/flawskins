// Testes do módulo de saques NexusPag com ADAPTADOR MOCK.
// Nada aqui faz rede ou envia Pix. O repositório em memória reproduz as
// regras das funções da migration 0027 (envio reivindicado 1x, estorno 1x,
// conflitos vão para revisão).
// Rodar: npm run test:saques
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decidirResultado,
  encontrarCandidato,
  enviarSaque,
  normalizarChavePix,
  reconciliarPorHistorico,
  reconciliarPorWebhook,
  validarPedido,
} from "../src/lib/nexuspag/saques.ts";

// ---------------------------------------------------------------------------
// Repositório em memória (espelha carteira_saques + extrato)
// ---------------------------------------------------------------------------
function criarRepo(saldoInicial = 500) {
  const saques = new Map();
  const extrato = [{ tipo: "deposito", valor: saldoInicial, referencia: "dep" }];
  let seq = 0;
  const saldo = () => Math.round(extrato.reduce((s, m) => s + m.valor, 0) * 100) / 100;
  const lancar = (tipo, valor, referencia) => {
    if (extrato.some((m) => m.tipo === tipo && m.referencia === referencia)) return false; // unique(tipo, referencia)
    extrato.push({ tipo, valor, referencia });
    return true;
  };
  const repo = {
    saques, extrato, saldo,
    /** carteira_saque_solicitar: reserva o saldo e cria pending. */
    solicitar({ valor, chave, tipo, user = "user-1" }) {
      if ([...saques.values()].some((s) => s.user_id === user && (s.status === "pending" || s.status === "processing"))) throw new Error("você já tem um saque em andamento");
      if (saldo() < valor) throw new Error("saldo insuficiente");
      const id = `saque-${++seq}`;
      const s = { id, user_id: user, valor, chave_pix: chave, pix_key_type: tipo, status: "pending", correlation_id: `cs-saque-${id}`, provider_withdrawal_id: null, enviado_em: null, precisa_revisao: false, valor_estornado: 0, motivo: null };
      saques.set(id, s);
      lancar("saque", -valor, id);
      return s;
    },
    async get(id) { const s = saques.get(id); return s ? { ...s } : null; },
    async findByProviderOrCorrelation(pid, corr) {
      return [...saques.values()].find((s) => (pid && s.provider_withdrawal_id === pid) || (corr && s.correlation_id === corr)) ?? null;
    },
    async listEmAberto() { return [...saques.values()].filter((s) => s.status === "processing").map((s) => ({ ...s })); },
    async claim(id) {
      const s = saques.get(id);
      if (!s || s.status !== "pending" || s.provider_withdrawal_id) return null;
      s.status = "processing";
      s.enviado_em = new Date().toISOString();
      return { ...s };
    },
    async recordDispatch(id, d) {
      const s = saques.get(id);
      s.provider_withdrawal_id ??= d.providerId;
      s.precisa_revisao ||= d.revisao;
      if (d.nota) s.motivo = d.nota;
    },
    async refundDifference(id, enviado) {
      const s = saques.get(id);
      const diff = Math.round((s.valor - enviado) * 100) / 100 - s.valor_estornado;
      if (diff <= 0) return 0;
      if (lancar("estorno_saque", diff, `ajuste:${id}`)) s.valor_estornado += diff;
      return diff;
    },
    async complete(id, pid) {
      const s = saques.get(id);
      if (s.status === "completed") return "ja_concluido";
      if (s.status === "failed") { s.precisa_revisao = true; return "conflito"; }
      s.status = "completed";
      s.provider_withdrawal_id ??= pid;
      return "concluido";
    },
    async fail(id, motivo) {
      const s = saques.get(id);
      if (s.status === "failed") return "ja_falhou";
      if (s.status === "completed") { s.precisa_revisao = true; return "conflito"; }
      const resto = s.valor - s.valor_estornado;
      if (resto > 0) lancar("estorno_saque", resto, id);
      s.status = "failed";
      s.valor_estornado = s.valor;
      s.motivo = motivo;
      return "falhou";
    },
    async markReview(id, motivo) { const s = saques.get(id); s.precisa_revisao = true; s.motivo = motivo; },
    async providerIdsVinculados(ids) { return new Set([...saques.values()].map((s) => s.provider_withdrawal_id).filter((x) => x && ids.includes(x))); },
  };
  return repo;
}

// ---------------------------------------------------------------------------
// Adaptador MOCK da NexusPag
// ---------------------------------------------------------------------------
function criarProvider({ resposta = { kind: "ok", withdrawalId: "w-1", amount: null, fee: 1, status: "completed", idempotent: false }, caixa = 10_000, ativo = true, historico = [], demora = 0, historicoFalha = false } = {}) {
  const chamadas = { create: [], list: 0, getShop: 0 };
  return {
    chamadas,
    async getShop() { chamadas.getShop++; return { ok: true, isActive: ativo, walletBalance: caixa }; },
    async createWithdrawal(shopId, body) {
      chamadas.create.push({ shopId, ...body });
      if (demora) await new Promise((r) => setTimeout(r, demora));
      return typeof resposta === "function" ? resposta(body) : { ...resposta, amount: resposta.amount ?? body.amount };
    },
    async listWithdrawals(_shop, page) {
      chamadas.list++;
      if (historicoFalha) throw new Error("histórico indisponível");
      return page === 1 ? (typeof historico === "function" ? historico() : historico) : [];
    },
  };
}

const CONFIG = { enabled: true, shopId: "shop-cloud", webhookUrl: "https://cloudskins.pro/api/webhooks/nexuspag" };
const CPF = "52998224725"; // CPF válido de teste (dígitos verificadores corretos)

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------
test("chave Pix: valida e normaliza por tipo", () => {
  assert.deepEqual(normalizarChavePix("cpf", "529.982.247-25"), { ok: true, chave: CPF });
  assert.equal(normalizarChavePix("cpf", "111.111.111-11").ok, false);
  assert.equal(normalizarChavePix("cpf", "529.982.247-26").ok, false);
  assert.deepEqual(normalizarChavePix("cnpj", "11.222.333/0001-81"), { ok: true, chave: "11222333000181" });
  assert.equal(normalizarChavePix("cnpj", "11.222.333/0001-80").ok, false);
  assert.deepEqual(normalizarChavePix("email", " Fulano@Exemplo.com "), { ok: true, chave: "fulano@exemplo.com" });
  assert.equal(normalizarChavePix("email", "sem-arroba").ok, false);
  assert.deepEqual(normalizarChavePix("phone", "(11) 91234-5678"), { ok: true, chave: "+5511912345678" });
  assert.deepEqual(normalizarChavePix("phone", "+55 11 91234-5678"), { ok: true, chave: "+5511912345678" });
  assert.equal(normalizarChavePix("phone", "1134567890").ok, false);
  assert.equal(normalizarChavePix("random", "123e4567-e89b-12d3-a456-426614174000").ok, true);
  assert.equal(normalizarChavePix("random", "abc").ok, false);
});

test("pedido: limites mínimo/máximo e tipo obrigatório", () => {
  assert.equal(validarPedido({ valor: 9.99, tipo: "cpf", chave: CPF }).ok, false);
  assert.equal(validarPedido({ valor: 1000.01, tipo: "cpf", chave: CPF }).ok, false);
  assert.equal(validarPedido({ valor: 50, tipo: "pix", chave: CPF }).ok, false);
  const ok = validarPedido({ valor: 50.005, tipo: "cpf", chave: "529.982.247-25" });
  assert.equal(ok.ok, true);
  assert.equal(ok.pedido.valor, 50.01);
});

// ---------------------------------------------------------------------------
// Interpretação da resposta
// ---------------------------------------------------------------------------
test("decisão: completed/processing/4xx/5xx/timeout/ajuste — nunca sugere reenviar", () => {
  const ok = (status, amount = 50) => ({ kind: "ok", withdrawalId: "w", amount, fee: 1, status, idempotent: false });
  assert.equal(decidirResultado(50, ok("completed")).status, "completed");
  assert.equal(decidirResultado(50, ok("processing")).status, "processing");
  assert.equal(decidirResultado(50, ok("processing")).revisao, false);
  const aj = decidirResultado(50, ok("completed", 40));
  assert.equal(aj.status, "completed");
  assert.equal(aj.revisao, true);
  assert.equal(aj.valorEnviado, 40);
  for (const s of [400, 403, 404, 429]) assert.equal(decidirResultado(50, { kind: "http_error", httpStatus: s, message: "" }).status, "failed", `HTTP ${s}`);
  for (const r of [{ kind: "http_error", httpStatus: 502, message: "" }, { kind: "http_error", httpStatus: 500, message: "" }, { kind: "timeout" }, { kind: "network", message: "x" }]) {
    const d = decidirResultado(50, r);
    assert.equal(d.status, "processing");
    assert.equal(d.revisao, true);
  }
  assert.equal(decidirResultado(50, { kind: "ok", withdrawalId: null, amount: 50, fee: 0, status: "completed", idempotent: false }).revisao, true);
});

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------
test("envio desligado: saque fica na fila e NADA é enviado", async () => {
  const repo = criarRepo();
  const p = criarProvider();
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  const r = await enviarSaque({ repo, provider: p, config: { ...CONFIG, enabled: false }, saqueId: s.id });
  assert.equal(r.estado, "desligado");
  assert.equal(p.chamadas.create.length, 0);
  assert.equal(repo.saques.get(s.id).status, "pending");
  assert.equal(repo.saldo(), 450); // reservado
});

test("reserva atômica: saldo debitado na criação; 2º saque simultâneo é recusado", () => {
  const repo = criarRepo(100);
  repo.solicitar({ valor: 80, chave: CPF, tipo: "cpf" });
  assert.equal(repo.saldo(), 20);
  assert.throws(() => repo.solicitar({ valor: 10, chave: CPF, tipo: "cpf" }), /em andamento/);
});

test("envio completed: envia 1x com correlation_id e sub_shop_id e conclui", async () => {
  const repo = criarRepo();
  const p = criarProvider();
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  const r = await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(r.estado, "enviado");
  assert.equal(p.chamadas.create.length, 1);
  assert.equal(p.chamadas.create[0].correlation_id, s.correlation_id);
  assert.equal(p.chamadas.create[0].sub_shop_id, "user-1");
  assert.equal(p.chamadas.create[0].pix_key_type, "cpf");
  assert.equal(repo.saques.get(s.id).status, "completed");
  assert.equal(repo.saldo(), 450);
});

test("disparos concorrentes do mesmo saque: só UM chega à NexusPag", async () => {
  const repo = criarRepo();
  const p = criarProvider({ demora: 20 });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  const rs = await Promise.all([1, 2, 3].map(() => enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id })));
  assert.equal(p.chamadas.create.length, 1);
  assert.equal(rs.filter((r) => r.estado === "enviado").length, 1);
});

test("timeout: fica processing + revisão, saldo continua reservado e NUNCA reenvia", async () => {
  const repo = criarRepo();
  const p = criarProvider({ resposta: { kind: "timeout" } });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  const depois = repo.saques.get(s.id);
  assert.equal(depois.status, "processing");
  assert.equal(depois.precisa_revisao, true);
  assert.equal(repo.saldo(), 450);
  const de_novo = await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(de_novo.estado, "ja_reivindicado");
  assert.equal(p.chamadas.create.length, 1);
});

test("erro 4xx + histórico confirma que não houve saque: falha e devolve o saldo uma única vez", async () => {
  for (const httpStatus of [400, 429]) {
    const repo = criarRepo();
    const p = criarProvider({ resposta: { kind: "http_error", httpStatus, message: "" } });
    const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
    await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
    assert.equal(repo.saques.get(s.id).status, "failed", `HTTP ${httpStatus}`);
    assert.equal(repo.saldo(), 500);
    await repo.fail(s.id, "de novo");
    assert.equal(repo.saldo(), 500, "estorno não duplica");
  }
});

test("valor ajustado pela NexusPag: devolve a diferença e marca revisão", async () => {
  const repo = criarRepo();
  const p = criarProvider({ resposta: (b) => ({ kind: "ok", withdrawalId: "w-aj", amount: b.amount - 15, fee: 1, status: "completed", idempotent: false }) });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(repo.saques.get(s.id).status, "completed");
  assert.equal(repo.saques.get(s.id).precisa_revisao, true);
  assert.equal(repo.saldo(), 465); // 500 − 50 + 15
});

test("caixa insuficiente ou subconta inativa: não reivindica nem envia (fica na fila)", async () => {
  for (const prov of [criarProvider({ caixa: 10 }), criarProvider({ ativo: false })]) {
    const repo = criarRepo();
    const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
    const r = await enviarSaque({ repo, provider: prov, config: CONFIG, saqueId: s.id });
    assert.equal(r.estado, "caixa_indisponivel");
    assert.equal(prov.chamadas.create.length, 0);
    assert.equal(repo.saques.get(s.id).status, "pending");
    assert.equal(repo.saques.get(s.id).precisa_revisao, true);
  }
});

// ---------------------------------------------------------------------------
// Reconciliação
// ---------------------------------------------------------------------------
test("webhook cashout.success/failed: fecha o saque; reentrega não duplica; fora de ordem vira revisão", async () => {
  const repo = criarRepo();
  const p = criarProvider({ resposta: { kind: "ok", withdrawalId: "w-9", amount: 50, fee: 1, status: "processing", idempotent: false } });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(repo.saques.get(s.id).status, "processing");

  assert.equal(await reconciliarPorWebhook(repo, { name: "cashout.success", payload: { withdrawal_id: "w-9" } }), "concluido");
  assert.equal(await reconciliarPorWebhook(repo, { name: "cashout.success", payload: { withdrawal_id: "w-9" } }), "sem_mudanca");
  assert.equal(await reconciliarPorWebhook(repo, { name: "cashout.failed", payload: { withdrawal_id: "w-9" } }), "revisao");
  assert.equal(repo.saques.get(s.id).status, "completed");
  assert.equal(repo.saldo(), 450, "falha tardia não devolve saldo de saque já pago");
  assert.equal(await reconciliarPorWebhook(repo, { name: "cashout.success", payload: { withdrawal_id: "outro" } }), "nao_encontrado");
});

test("webhook cashout.failed por correlation_id devolve o saldo", async () => {
  const repo = criarRepo();
  const p = criarProvider({ resposta: { kind: "timeout" } });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(await reconciliarPorWebhook(repo, { name: "cashout.failed", payload: { correlation_id: s.correlation_id, failure_reason: "Chave inválida" } }), "falhou");
  assert.equal(repo.saldo(), 500);
});

test("histórico: saque com timeout é vinculado ao único candidato e concluído; ambíguo vai para revisão", async () => {
  // único candidato
  const repo = criarRepo();
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: criarProvider({ resposta: { kind: "timeout" } }), config: CONFIG, saqueId: s.id });
  const quando = repo.saques.get(s.id).enviado_em;
  const prov = criarProvider({ historico: [{ id: "w-h", amount: 50, fee: 1, status: "completed", pix_key: CPF, failure_reason: null, created_at: quando }] });
  const r = await reconciliarPorHistorico({ repo, provider: prov, shopId: "shop-cloud" });
  assert.equal(r.concluidos, 1);
  assert.equal(repo.saques.get(s.id).status, "completed");
  assert.equal(repo.saques.get(s.id).provider_withdrawal_id, "w-h");
  assert.equal(prov.chamadas.create.length, 0, "reconciliação nunca cria saque");

  // ambíguo
  const repo2 = criarRepo();
  const s2 = repo2.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo: repo2, provider: criarProvider({ resposta: { kind: "timeout" } }), config: CONFIG, saqueId: s2.id });
  const q2 = repo2.saques.get(s2.id).enviado_em;
  const dois = [1, 2].map((i) => ({ id: `w-${i}`, amount: 50, fee: 1, status: "completed", pix_key: CPF, failure_reason: null, created_at: q2 }));
  const r2 = await reconciliarPorHistorico({ repo: repo2, provider: criarProvider({ historico: dois }), shopId: "shop-cloud" });
  assert.equal(r2.revisao, 1);
  assert.equal(repo2.saques.get(s2.id).status, "processing");
});

test("histórico: saque failed no provedor devolve o saldo; processing continua aguardando", async () => {
  const repo = criarRepo();
  const p = criarProvider({ resposta: { kind: "ok", withdrawalId: "w-f", amount: 50, fee: 1, status: "processing", idempotent: false } });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  const aguardando = await reconciliarPorHistorico({ repo, provider: criarProvider({ historico: [{ id: "w-f", amount: 50, fee: 1, status: "processing", pix_key: CPF, failure_reason: null, created_at: null }] }), shopId: "x" });
  assert.equal(aguardando.semMudanca, 1);
  const falhou = await reconciliarPorHistorico({ repo, provider: criarProvider({ historico: [{ id: "w-f", amount: 50, fee: 1, status: "failed", pix_key: CPF, failure_reason: "Recusado", created_at: null }] }), shopId: "x" });
  assert.equal(falhou.falhos, 1);
  assert.equal(repo.saldo(), 500);
});

test("candidato: fora da janela de tempo ou chave diferente não é vinculado", () => {
  const base = { id: "s", user_id: "u", valor: 50, chave_pix: CPF, pix_key_type: "cpf", status: "processing", correlation_id: "c", provider_withdrawal_id: null, enviado_em: "2026-11-05T12:00:00.000Z", precisa_revisao: true };
  const w = (o) => ({ id: "w", amount: 50, fee: 1, status: "completed", pix_key: CPF, failure_reason: null, created_at: "2026-11-05T12:01:00.000Z", ...o });
  assert.equal(encontrarCandidato(base, [w({ created_at: "2026-11-05T13:00:00.000Z" })], new Set()), null);
  assert.equal(encontrarCandidato(base, [w({ pix_key: "outra@chave.com" })], new Set()), null);
  assert.equal(encontrarCandidato(base, [w({ amount: 60 })], new Set()), null);
  assert.equal(encontrarCandidato(base, [w({})], new Set(["w"])), null);
  assert.equal(encontrarCandidato(base, [w({})], new Set()).id, "w");
});

test("erro 4xx (429) com saque compatível no histórico: NÃO devolve o saldo, fica processing + revisão", async () => {
  const repo = criarRepo();
  // O histórico mostra um saque de mesmo valor/chave criado agora, não vinculado a nenhum pedido nosso.
  const p = criarProvider({
    resposta: { kind: "http_error", httpStatus: 429, message: "" },
    historico: () => [{ id: "w-fantasma", amount: 50, fee: 1, status: "processing", pix_key: CPF, failure_reason: null, created_at: new Date().toISOString() }],
  });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  const r = await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(r.decisao.status, "processing");
  assert.equal(repo.saques.get(s.id).status, "processing");
  assert.equal(repo.saques.get(s.id).precisa_revisao, true);
  assert.equal(repo.saldo(), 450, "saldo continua reservado");
  assert.equal(p.chamadas.create.length, 1, "não reenvia");
});

test("erro 4xx com histórico indisponível: NÃO devolve o saldo (indeterminado → revisão)", async () => {
  const repo = criarRepo();
  const p = criarProvider({ resposta: { kind: "http_error", httpStatus: 400, message: "" }, historicoFalha: true });
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s.id });
  assert.equal(repo.saques.get(s.id).status, "processing");
  assert.equal(repo.saldo(), 450);
});

test("saque anterior do mesmo usuário (já vinculado) não bloqueia a confirmação de ausência", async () => {
  const repo = criarRepo();
  // 1º saque concluído e vinculado ao id w-1
  const s1 = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: criarProvider(), config: CONFIG, saqueId: s1.id });
  // 2º saque recebe 429 (cooldown); o histórico só tem o w-1, que já é nosso
  const p = criarProvider({
    resposta: { kind: "http_error", httpStatus: 429, message: "" },
    historico: () => [{ id: "w-1", amount: 50, fee: 1, status: "completed", pix_key: CPF, failure_reason: null, created_at: new Date().toISOString() }],
  });
  const s2 = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  await enviarSaque({ repo, provider: p, config: CONFIG, saqueId: s2.id });
  assert.equal(repo.saques.get(s2.id).status, "failed");
  assert.equal(repo.saldo(), 450, "devolveu só o 2º; o 1º continua pago");
});

test("ENABLED=false: nenhuma chamada ao provedor em nenhuma etapa do envio", async () => {
  const repo = criarRepo();
  const p = criarProvider();
  const s = repo.solicitar({ valor: 50, chave: CPF, tipo: "cpf" });
  for (let i = 0; i < 3; i++) await enviarSaque({ repo, provider: p, config: { ...CONFIG, enabled: false }, saqueId: s.id });
  assert.deepEqual(p.chamadas, { create: [], list: 0, getShop: 0 });
});
