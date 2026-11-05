#!/usr/bin/env node
// Envia um evento NexusPag simulado e ASSINADO para o endpoint local.
//
// Uso:
//   node scripts/nexuspag-webhook-local.mjs [evento] [--invalido] [--repetir] [--url=...]
//
//   evento     payment.confirmed (padrão) | cashout.success | cashout.failed | refund.completed
//   --invalido assina com um segredo errado (deve responder 401)
//   --repetir  envia o mesmo evento duas vezes (a 2ª deve vir com duplicate: true)
//   --url=     destino (padrão http://localhost:3000/api/webhooks/nexuspag)
//
// O segredo vem de NEXUSPAG_WEBHOOK_SECRET (ambiente ou .env.local).

import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const evento = args.find((a) => !a.startsWith("--")) ?? "payment.confirmed";
const invalido = args.includes("--invalido");
const repetir = args.includes("--repetir");
const url = args.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:3000/api/webhooks/nexuspag";

let secret = process.env.NEXUSPAG_WEBHOOK_SECRET;
if (!secret && existsSync(".env.local")) {
  secret = readFileSync(".env.local", "utf8").match(/^NEXUSPAG_WEBHOOK_SECRET=(.+)$/m)?.[1]?.trim();
}
if (!secret) {
  console.error("Defina NEXUSPAG_WEBHOOK_SECRET (no ambiente ou no .env.local).");
  process.exit(1);
}

const id = randomUUID();
const agora = new Date().toISOString();
const PAYLOADS = {
  "payment.confirmed": {
    event: "payment.confirmed", transaction_id: id, txid: `E2E${Date.now()}`, external_id: `teste-${id.slice(0, 8)}`,
    status: "paid", amount: 25, fee: 0.5, net_amount: 24.5, payer_name: "Teste Local",
    payer_document_masked: "***.000.000-**", paid_at: agora,
  },
  "cashout.success": { event: "cashout.success", withdrawal_id: id, correlation_id: `saque-${id.slice(0, 8)}`, amount: 20, status: "completed" },
  "cashout.failed": { event: "cashout.failed", withdrawal_id: id, correlation_id: `saque-${id.slice(0, 8)}`, amount: 20, status: "failed", failure_reason: "Teste" },
  "refund.completed": { event: "refund.completed", refund_id: `rf_${id.slice(0, 8)}`, transaction_id: id, amount: 25, status: "refunded" },
};
const payload = PAYLOADS[evento];
if (!payload) {
  console.error(`Evento desconhecido: ${evento}. Use: ${Object.keys(PAYLOADS).join(", ")}`);
  process.exit(1);
}

async function enviar() {
  const body = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", invalido ? "segredo-errado" : secret).update(`${t}.${body}`).digest("hex");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Event": evento, "X-Webhook-Signature": `t=${t},v1=${v1}` },
    body,
  });
  console.log(`${res.status} ${await res.text()}`);
}

await enviar();
if (repetir) await enviar();
