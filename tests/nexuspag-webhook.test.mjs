// Testes do webhook NexusPag com eventos simulados (sem rede, sem banco).
// Rodar: npm run test:nexuspag
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildSignatureHeader,
  computeSignature,
  createMemoryStore,
  parseEvent,
  parseSignatureHeader,
  processWebhook,
  verifySignature,
} from "../src/lib/nexuspag/webhook.ts";

const SECRET = "whsec_teste_local_nao_usar_em_producao";
const NOW = 1_793_900_000; // instante fixo para os testes

// Payloads no formato da documentação (payment.confirmed) e, para saques e
// estornos, com os IDs usados na API de saques da NexusPag.
const EVENTOS = {
  "payment.confirmed": {
    event: "payment.confirmed",
    transaction_id: "c1f0e2a4-0000-4000-8000-000000000001",
    txid: "E2E-TESTE-001",
    external_id: "deposito-123",
    status: "paid",
    amount: 50,
    fee: 0.99,
    net_amount: 49.01,
    payer_name: "Fulano de Tal",
    payer_document_masked: "***.456.789-**",
    paid_at: "2026-11-05T12:00:00.000Z",
  },
  "cashout.success": {
    event: "cashout.success",
    withdrawal_id: "9c29870c-9f69-4bb6-90d3-2dce9453bb45",
    correlation_id: "saque-777",
    amount: 30,
    status: "completed",
    gateway_e2eid: "E18236120202401151032s5G3Q9NaQpQ",
  },
  "cashout.failed": {
    event: "cashout.failed",
    withdrawal_id: "9c29870c-9f69-4bb6-90d3-2dce9453bb46",
    correlation_id: "saque-778",
    amount: 30,
    status: "failed",
    failure_reason: "Chave Pix inválida",
  },
  "refund.completed": {
    event: "refund.completed",
    refund_id: "rf_0001",
    transaction_id: "c1f0e2a4-0000-4000-8000-000000000001",
    amount: 50,
    status: "refunded",
  },
};

function entrega(payload, { secret = SECRET, t = NOW, header } = {}) {
  const rawBody = JSON.stringify(payload);
  return {
    rawBody,
    signatureHeader: header === undefined ? buildSignatureHeader(rawBody, secret, t) : header,
    eventHeader: payload.event ?? null,
  };
}

const run = (d, store, extra = {}) =>
  processWebhook({ ...d, secret: SECRET, store, nowSeconds: NOW, ...extra });

// ---------- assinatura ----------

test("assinatura: formato da doc (t=<unix>,v1=<hex>) e HMAC-SHA256 de '<t>.<corpo cru>'", () => {
  const body = '{"event":"payment.confirmed"}';
  const header = buildSignatureHeader(body, SECRET, NOW);
  assert.match(header, /^t=\d+,v1=[0-9a-f]{64}$/);
  const parsed = parseSignatureHeader(header);
  assert.equal(parsed.timestamp, NOW);
  assert.equal(parsed.signatures[0], computeSignature(NOW, body, SECRET));
  assert.deepEqual(verifySignature({ rawBody: body, header, secret: SECRET, nowSeconds: NOW }), { ok: true, timestamp: NOW });
});

test("assinatura: usa o corpo CRU — mesmo JSON com espaçamento diferente não valida", () => {
  const original = '{"event":"payment.confirmed","amount":50}';
  const header = buildSignatureHeader(original, SECRET, NOW);
  const reformatado = '{ "event": "payment.confirmed", "amount": 50 }';
  assert.equal(verifySignature({ rawBody: reformatado, header, secret: SECRET, nowSeconds: NOW }).ok, false);
});

test("assinatura: rejeita segredo errado, header ausente/malformado e timestamp fora da janela", () => {
  const body = '{"event":"payment.confirmed"}';
  const ok = { rawBody: body, secret: SECRET, nowSeconds: NOW };
  assert.equal(verifySignature({ ...ok, header: buildSignatureHeader(body, "outro", NOW) }).reason, "signature_mismatch");
  assert.equal(verifySignature({ ...ok, header: null }).reason, "missing_header");
  assert.equal(verifySignature({ ...ok, header: "v1=abc" }).reason, "malformed_header");
  assert.equal(verifySignature({ ...ok, header: "t=abc,v1=" + "0".repeat(64) }).reason, "malformed_header");
  assert.equal(verifySignature({ ...ok, header: buildSignatureHeader(body, SECRET, NOW - 301) }).reason, "timestamp_out_of_window");
  assert.equal(verifySignature({ ...ok, header: buildSignatureHeader(body, SECRET, NOW + 301) }).reason, "timestamp_out_of_window");
  assert.equal(verifySignature({ ...ok, header: buildSignatureHeader(body, SECRET, NOW - 299) }).ok, true);
});

test("assinatura: aceita qualquer v1 válido (rotação de segredo)", () => {
  const body = '{"event":"payment.confirmed"}';
  const header = `t=${NOW},v1=${"a".repeat(64)},v1=${computeSignature(NOW, body, SECRET)}`;
  assert.equal(verifySignature({ rawBody: body, header, secret: SECRET, nowSeconds: NOW }).ok, true);
});

// ---------- eventos ----------

test("eventos suportados: os 4 são registrados com a chave de idempotência certa", async () => {
  const store = createMemoryStore();
  const esperadas = {
    "payment.confirmed": "payment.confirmed:c1f0e2a4-0000-4000-8000-000000000001",
    "cashout.success": "cashout.success:9c29870c-9f69-4bb6-90d3-2dce9453bb45",
    "cashout.failed": "cashout.failed:9c29870c-9f69-4bb6-90d3-2dce9453bb46",
    "refund.completed": "refund.completed:rf_0001",
  };
  for (const [nome, payload] of Object.entries(EVENTOS)) {
    const r = await run(entrega(payload), store);
    assert.equal(r.status, 200, nome);
    assert.equal(r.body.duplicate, false, nome);
    assert.equal(r.body.action, "registrado", nome);
  }
  assert.deepEqual(store.records.map((x) => x.idempotency_key), Object.values(esperadas));
  assert.ok(store.records.every((x) => x.supported && x.status === "registrado"));
});

test("idempotência: reentrega do mesmo evento é aceita (200) mas registrada uma vez só", async () => {
  const store = createMemoryStore();
  const d = entrega(EVENTOS["payment.confirmed"]);
  const primeira = await run(d, store);
  // A NexusPag reenvia com novo timestamp/assinatura; o conteúdo é o mesmo.
  const reenvio = await run(entrega(EVENTOS["payment.confirmed"], { t: NOW + 60 }), store, { nowSeconds: NOW + 60 });
  assert.equal(primeira.body.duplicate, false);
  assert.equal(reenvio.status, 200);
  assert.equal(reenvio.body.duplicate, true);
  assert.equal(store.records.length, 1);
});

test("idempotência: event_id explícito tem prioridade; sem IDs usa hash do corpo", () => {
  const comId = parseEvent(JSON.stringify({ event: "cashout.success", event_id: "evt-1", withdrawal_id: "w1" }), null);
  assert.equal(comId.event.idempotencyKey, "cashout.success:evt:evt-1");
  const semId = parseEvent(JSON.stringify({ event: "refund.completed", amount: 10 }), null);
  assert.match(semId.event.idempotencyKey, /^refund\.completed:sha256:[0-9a-f]{64}$/);
});

test("evento desconhecido: assinado é aceito (200) e registrado como 'ignorado'", async () => {
  const store = createMemoryStore();
  const r = await run(entrega({ event: "spei.payment.confirmed", event_id: "e-9", payment_id: "p-9" }), store);
  assert.equal(r.status, 200);
  assert.equal(r.body.action, "ignorado");
  assert.equal(store.records[0].status, "ignorado");
  assert.equal(store.records[0].supported, false);
});

// ---------- rejeições ----------

test("assinatura inválida → 401 e NADA é registrado", async () => {
  const store = createMemoryStore();
  const r = await run(entrega(EVENTOS["payment.confirmed"], { secret: "segredo-errado" }), store);
  assert.equal(r.status, 401);
  assert.equal(r.body.error, "invalid_signature");
  assert.equal(store.records.length, 0);
});

test("corpo adulterado depois de assinado → 401", async () => {
  const store = createMemoryStore();
  const d = entrega(EVENTOS["payment.confirmed"]);
  const r = await run({ ...d, rawBody: d.rawBody.replace('"amount":50', '"amount":5000') }, store);
  assert.equal(r.status, 401);
  assert.equal(store.records.length, 0);
});

test("sem header de assinatura → 401", async () => {
  const r = await run(entrega(EVENTOS["cashout.success"], { header: null }), createMemoryStore());
  assert.equal(r.status, 401);
  assert.equal(r.body.reason, "missing_header");
});

test("evento do header diferente do corpo → 400", async () => {
  const d = entrega(EVENTOS["cashout.failed"]);
  const r = await run({ ...d, eventHeader: "cashout.success" }, createMemoryStore());
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "event_mismatch");
});

test("JSON inválido (mas assinado) → 400", async () => {
  const rawBody = "{nao-e-json";
  const r = await run({ rawBody, signatureHeader: buildSignatureHeader(rawBody, SECRET, NOW), eventHeader: "payment.confirmed" }, createMemoryStore());
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "invalid_json");
});

test("segredo não configurado → 503 (falha fechada; NexusPag reenvia depois)", async () => {
  const r = await processWebhook({ ...entrega(EVENTOS["payment.confirmed"]), secret: "", store: createMemoryStore(), nowSeconds: NOW });
  assert.equal(r.status, 503);
});

test("falha no banco → 500 (NexusPag reenvia; idempotência evita duplicar)", async () => {
  const quebrado = { insert: async () => { throw new Error("db offline"); } };
  const r = await run(entrega(EVENTOS["payment.confirmed"]), quebrado);
  assert.equal(r.status, 500);
});

test("payload acima de 256 KB → 413", async () => {
  const grande = { event: "payment.confirmed", transaction_id: "x", lixo: "a".repeat(300 * 1024) };
  const r = await run(entrega(grande), createMemoryStore());
  assert.equal(r.status, 413);
});

test("nenhum efeito financeiro: o único efeito é o registro no store", async () => {
  const chamadas = [];
  const store = { insert: async (rec) => { chamadas.push(rec); return "inserted"; } };
  for (const payload of Object.values(EVENTOS)) await run(entrega(payload), store);
  assert.equal(chamadas.length, 4);
  assert.ok(chamadas.every((c) => /não implementad/.test(c.note)));
});
