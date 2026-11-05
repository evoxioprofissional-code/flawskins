// Saques via NexusPag — regras puras (sem Next, sem Supabase, sem rede).
//
// Contrato (https://nexuspag.com/docs/integre-com-ia → "Sacar Saldo da Subconta"):
//   POST /api/shops/{id}/withdraw  { amount, pix_key, pix_key_type, correlation_id, sub_shop_id, webhook_url }
//   200 → { withdrawal_id, amount, fee, net_amount, status: "completed" | "processing", idempotent? }
//   400 valor/chave · 401 api key · 403 desabilitado · 404 subconta · 429 cooldown · 502 gateway
//   - O valor pode ser AJUSTADO para baixo (limite/saldo) — compare com o pedido.
//   - Timeout no gateway: o saque fica processing e o saldo NÃO é estornado.
//
// Regra de ouro: nada aqui reenvia um saque. Ambiguidade (timeout, rede, 5xx)
// vira "processing + revisão"; só a reconciliação (webhook/histórico) fecha.
//
// Usado pelo servidor (src/lib/nexuspag/saques-server.ts), pela tela (validação)
// e pelos testes (tests/nexuspag-saques.test.mjs) com um adaptador mock.

export const PIX_KEY_TYPES = ["cpf", "cnpj", "email", "phone", "random"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export const PIX_KEY_LABEL: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Chave aleatória",
};

export type SaqueStatus = "pending" | "processing" | "completed" | "failed";

export type Limites = { minimo: number; maximo: number };
export const LIMITES_PADRAO: Limites = { minimo: 10, maximo: 1000 };

// ---------------------------------------------------------------------------
// Chave Pix
// ---------------------------------------------------------------------------

const digits = (s: string) => s.replace(/\D/g, "");

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(cpf[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
}

function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dv = (len: number) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, p, i) => acc + Number(cnpj[i]) * p, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(cnpj[12]) && dv(13) === Number(cnpj[13]);
}

export type ChaveResult = { ok: true; chave: string } | { ok: false; erro: string };

/** Valida e normaliza a chave conforme o tipo (formato que a NexusPag recebe). */
export function normalizarChavePix(tipo: PixKeyType, bruto: string): ChaveResult {
  const v = (bruto ?? "").trim();
  switch (tipo) {
    case "cpf": {
      const d = digits(v);
      return cpfValido(d) ? { ok: true, chave: d } : { ok: false, erro: "CPF inválido." };
    }
    case "cnpj": {
      const d = digits(v);
      return cnpjValido(d) ? { ok: true, chave: d } : { ok: false, erro: "CNPJ inválido." };
    }
    case "email": {
      const e = v.toLowerCase();
      return /^[^\s@]{1,64}@[^\s@]+\.[a-z]{2,}$/i.test(e) && e.length <= 77
        ? { ok: true, chave: e }
        : { ok: false, erro: "E-mail inválido." };
    }
    case "phone": {
      let d = digits(v);
      if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
      // DDD (2) + 9 dígitos de celular
      return /^[1-9]{2}9\d{8}$/.test(d) ? { ok: true, chave: `+55${d}` } : { ok: false, erro: "Telefone inválido (use DDD + número de celular)." };
    }
    case "random": {
      const r = v.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r)
        ? { ok: true, chave: r }
        : { ok: false, erro: "Chave aleatória inválida." };
    }
    default:
      return { ok: false, erro: "Tipo de chave inválido." };
  }
}

export type PedidoSaque = { valor: number; tipo: PixKeyType; chave: string };

const reais = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Validação do pedido (a mesma regra roda de novo no banco, com os limites oficiais). */
export function validarPedido(
  input: { valor: number; tipo: string; chave: string },
  limites: Limites = LIMITES_PADRAO,
): { ok: true; pedido: PedidoSaque } | { ok: false; erro: string } {
  if (!(PIX_KEY_TYPES as readonly string[]).includes(input.tipo)) return { ok: false, erro: "Escolha o tipo da chave Pix." };
  const valor = Math.round(Number(input.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: "Informe o valor do saque." };
  if (valor < limites.minimo) return { ok: false, erro: `O saque mínimo é R$ ${reais(limites.minimo)}.` };
  if (valor > limites.maximo) return { ok: false, erro: `O saque máximo é R$ ${reais(limites.maximo)} por pedido.` };
  const chave = normalizarChavePix(input.tipo as PixKeyType, input.chave);
  if (!chave.ok) return chave;
  return { ok: true, pedido: { valor, tipo: input.tipo as PixKeyType, chave: chave.chave } };
}

// ---------------------------------------------------------------------------
// Provedor (adaptador): interface implementada pelo cliente real e pelo mock
// ---------------------------------------------------------------------------

export type ProviderWithdrawal = {
  id: string;
  amount: number;
  fee: number | null;
  status: string; // pending | processing | completed | failed
  pix_key: string | null;
  failure_reason: string | null;
  created_at: string | null;
};

export type CreateResult =
  | { kind: "ok"; withdrawalId: string | null; amount: number; fee: number | null; status: string; idempotent: boolean }
  | { kind: "http_error"; httpStatus: number; message: string }
  | { kind: "timeout" }
  | { kind: "network"; message: string };

export interface WithdrawProvider {
  getShop(shopId: string): Promise<{ ok: true; isActive: boolean; walletBalance: number } | { ok: false; httpStatus: number | null }>;
  createWithdrawal(shopId: string, body: {
    amount: number;
    pix_key: string;
    pix_key_type: PixKeyType;
    correlation_id: string;
    sub_shop_id: string;
    webhook_url?: string;
  }): Promise<CreateResult>;
  listWithdrawals(shopId: string, page: number): Promise<ProviderWithdrawal[]>;
}

// ---------------------------------------------------------------------------
// Decisões
// ---------------------------------------------------------------------------

export function mapearStatusProvedor(s: string | null | undefined): SaqueStatus | null {
  switch ((s ?? "").toLowerCase()) {
    case "completed":
    case "success":
    case "paid":
      return "completed";
    case "failed":
    case "error":
    case "rejected":
    case "cancelled":
    case "canceled":
      return "failed";
    case "pending":
    case "processing":
      return "processing";
    default:
      return null;
  }
}

export type Decisao = {
  status: "processing" | "completed" | "failed";
  revisao: boolean;
  /** Valor efetivamente enviado (quando o provedor ajustou para menos). */
  valorEnviado: number | null;
  taxa: number | null;
  providerId: string | null;
  providerStatus: string | null;
  nota: string;
};

/** Interpreta a resposta do POST /withdraw. Nunca sugere reenviar. */
export function decidirResultado(pedido: number, r: CreateResult): Decisao {
  const base = { valorEnviado: null, taxa: null, providerId: null, providerStatus: null };
  if (r.kind === "ok") {
    const st = mapearStatusProvedor(r.status);
    const ajustado = Math.round(r.amount * 100) < Math.round(pedido * 100);
    const maior = Math.round(r.amount * 100) > Math.round(pedido * 100);
    const comum = {
      valorEnviado: r.amount,
      taxa: r.fee,
      providerId: r.withdrawalId,
      providerStatus: r.status,
    };
    if (!r.withdrawalId) return { ...comum, status: "processing", revisao: true, nota: "Resposta sem withdrawal_id." };
    if (maior) return { ...comum, status: "processing", revisao: true, nota: "Provedor informou valor MAIOR que o pedido." };
    if (st === "failed") return { ...comum, status: "failed", revisao: false, nota: "Saque recusado pelo provedor." };
    return {
      ...comum,
      status: st === "completed" ? "completed" : "processing",
      revisao: ajustado || st === null,
      nota: ajustado
        ? `Valor ajustado pelo provedor: R$ ${r.amount.toFixed(2)} de R$ ${pedido.toFixed(2)}.`
        : st === null
          ? `Status desconhecido do provedor: ${r.status}.`
          : r.idempotent
            ? "Saque já existente (correlation_id)."
            : "",
    };
  }
  if (r.kind === "http_error") {
    // 4xx definitivos: o provedor NÃO criou o saque → falha e devolve o saldo.
    if ([400, 401, 403, 404, 422, 429].includes(r.httpStatus)) {
      const motivo =
        r.httpStatus === 429
          ? "Aguarde alguns minutos entre saques e tente de novo."
          : r.httpStatus === 401 || r.httpStatus === 403
            ? "Saques indisponíveis no momento."
            : r.httpStatus === 404
              ? "Subconta de saques não encontrada."
              : r.message || "Dados do saque recusados.";
      return { ...base, status: "failed", revisao: r.httpStatus === 401 || r.httpStatus === 404, nota: motivo };
    }
    // 5xx / 502 / outros: ambíguo → fica processing para reconciliar.
    return { ...base, status: "processing", revisao: true, nota: `Resposta ${r.httpStatus} do provedor: aguardando reconciliação.` };
  }
  return {
    ...base,
    status: "processing",
    revisao: true,
    nota: r.kind === "timeout" ? "Tempo esgotado: aguardando reconciliação (não reenviar)." : `Falha de rede: aguardando reconciliação (${r.message}).`,
  };
}

// ---------------------------------------------------------------------------
// Repositório (implementado no servidor com as funções da migration 0027)
// ---------------------------------------------------------------------------

export type SaqueRegistro = {
  id: string;
  user_id: string;
  valor: number;
  chave_pix: string;
  pix_key_type: PixKeyType | null;
  status: SaqueStatus;
  correlation_id: string;
  provider_withdrawal_id: string | null;
  enviado_em: string | null;
  precisa_revisao: boolean;
};

export interface SaqueRepo {
  get(id: string): Promise<SaqueRegistro | null>;
  findByProviderOrCorrelation(providerId: string | null, correlationId: string | null): Promise<SaqueRegistro | null>;
  listEmAberto(): Promise<SaqueRegistro[]>; // processing (e pending com revisão)
  /** pending → processing (vence uma vez só); null se já reivindicado. */
  claim(id: string): Promise<SaqueRegistro | null>;
  recordDispatch(id: string, d: { providerId: string | null; providerStatus: string | null; valorEnviado: number | null; taxa: number | null; revisao: boolean; nota: string }): Promise<void>;
  refundDifference(id: string, valorEnviado: number): Promise<number>;
  complete(id: string, providerId: string | null, taxa: number | null): Promise<string>;
  fail(id: string, motivo: string): Promise<string>;
  markReview(id: string, motivo: string): Promise<void>;
  /** IDs da NexusPag que já pertencem a algum saque nosso (para não confundir com outro pedido). */
  providerIdsVinculados(ids: string[]): Promise<Set<string>>;
}

export type Config = {
  enabled: boolean;
  shopId: string | null;
  webhookUrl?: string;
};

export type EnvioResultado =
  | { estado: "desligado" }
  | { estado: "ja_reivindicado" }
  | { estado: "sem_configuracao" }
  | { estado: "caixa_indisponivel"; motivo: string }
  | { estado: "enviado"; decisao: Decisao };

/**
 * Envia UM saque pending à NexusPag, exatamente uma vez.
 * 1) checa a subconta (ativa e com caixa) ANTES de reivindicar;
 * 2) reivindica (pending → processing) — se perder a corrida, para;
 * 3) chama o provedor uma única vez e aplica a decisão.
 */
export async function enviarSaque(opts: { repo: SaqueRepo; provider: WithdrawProvider; config: Config; saqueId: string }): Promise<EnvioResultado> {
  const { repo, provider, config } = opts;
  if (!config.enabled) return { estado: "desligado" };
  if (!config.shopId) return { estado: "sem_configuracao" };

  const atual = await repo.get(opts.saqueId);
  if (!atual || atual.status !== "pending" || atual.provider_withdrawal_id) return { estado: "ja_reivindicado" };
  if (!atual.pix_key_type) {
    await repo.markReview(atual.id, "Saque sem tipo de chave Pix.");
    return { estado: "caixa_indisponivel", motivo: "sem tipo de chave" };
  }

  // Propriedade/estado da subconta da Cloud + caixa suficiente (evita ajuste automático do valor).
  const shop = await provider.getShop(config.shopId);
  if (!shop.ok || !shop.isActive) {
    await repo.markReview(atual.id, "Subconta de saques indisponível.");
    return { estado: "caixa_indisponivel", motivo: "subconta indisponível" };
  }
  if (shop.walletBalance < atual.valor) {
    await repo.markReview(atual.id, "Caixa da subconta insuficiente; saque mantido na fila.");
    return { estado: "caixa_indisponivel", motivo: "caixa insuficiente" };
  }

  const claimed = await repo.claim(atual.id);
  if (!claimed) return { estado: "ja_reivindicado" };

  const r = await provider.createWithdrawal(config.shopId, {
    amount: claimed.valor,
    pix_key: claimed.chave_pix,
    pix_key_type: claimed.pix_key_type as PixKeyType,
    correlation_id: claimed.correlation_id,
    sub_shop_id: claimed.user_id,
    webhook_url: config.webhookUrl,
  });
  const decisao = decidirResultado(claimed.valor, r);

  await repo.recordDispatch(claimed.id, {
    providerId: decisao.providerId,
    providerStatus: decisao.providerStatus,
    valorEnviado: decisao.valorEnviado,
    taxa: decisao.taxa,
    revisao: decisao.revisao,
    nota: decisao.nota,
  });
  if (decisao.valorEnviado !== null && decisao.valorEnviado < claimed.valor) {
    await repo.refundDifference(claimed.id, decisao.valorEnviado);
  }
  if (decisao.status === "completed") {
    await repo.complete(claimed.id, decisao.providerId, decisao.taxa);
  } else if (decisao.status === "failed") {
    // Recusa explícita no corpo (status failed com withdrawal_id) é confiável.
    // Erro HTTP (4xx) só libera o saldo se o histórico CONFIRMAR que não há saque.
    if (r.kind === "http_error") {
      const ausencia = await confirmarAusencia({ repo, provider, shopId: config.shopId, saque: claimed });
      if (ausencia !== "ausente") {
        const nota = `${decisao.nota} Saldo mantido reservado: ${ausencia === "possivel" ? "há saque compatível no histórico" : "não foi possível consultar o histórico"}.`;
        await repo.markReview(claimed.id, nota);
        return { estado: "enviado", decisao: { ...decisao, status: "processing", revisao: true, nota } };
      }
    }
    await repo.fail(claimed.id, decisao.nota);
  }
  return { estado: "enviado", decisao };
}

/**
 * Confirma no histórico da subconta que um saque recusado por HTTP 4xx NÃO
 * foi criado. "ausente" = nenhum saque compatível (valor ≤ pedido, mesma
 * chave, desde 2 min antes do envio, não vinculado a outro pedido nosso).
 * "possivel" = existe candidato. "indeterminado" = histórico indisponível.
 */
export async function confirmarAusencia(opts: {
  repo: SaqueRepo;
  provider: WithdrawProvider;
  shopId: string;
  saque: SaqueRegistro;
  paginas?: number;
}): Promise<"ausente" | "possivel" | "indeterminado"> {
  const lista: ProviderWithdrawal[] = [];
  try {
    for (let p = 1; p <= (opts.paginas ?? 2); p++) {
      const pagina = await opts.provider.listWithdrawals(opts.shopId, p);
      lista.push(...pagina);
      if (pagina.length < 100) break;
    }
  } catch {
    return "indeterminado";
  }
  const vinculados = await opts.repo.providerIdsVinculados(lista.map((w) => w.id)).catch(() => null);
  if (!vinculados) return "indeterminado";
  const c = encontrarCandidato({ ...opts.saque, enviado_em: opts.saque.enviado_em ?? new Date().toISOString() }, lista, vinculados);
  return c === null ? "ausente" : "possivel";
}

// ---------------------------------------------------------------------------
// Reconciliação
// ---------------------------------------------------------------------------

export type ReconciliacaoAcao = "concluido" | "falhou" | "sem_mudanca" | "nao_encontrado" | "revisao";

/** Evento de webhook (cashout.success / cashout.failed) já com assinatura validada. */
export async function reconciliarPorWebhook(
  repo: SaqueRepo,
  evento: { name: string; payload: Record<string, unknown> },
): Promise<ReconciliacaoAcao> {
  if (evento.name !== "cashout.success" && evento.name !== "cashout.failed") return "sem_mudanca";
  const p = evento.payload;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);
  const providerId = s(p.withdrawal_id) ?? s(p.id);
  const correlation = s(p.correlation_id);
  const saque = await repo.findByProviderOrCorrelation(providerId, correlation);
  if (!saque) return "nao_encontrado";

  if (evento.name === "cashout.success") {
    const r = await repo.complete(saque.id, providerId, typeof p.fee === "number" ? p.fee : null);
    return r === "conflito" ? "revisao" : r === "ja_concluido" ? "sem_mudanca" : "concluido";
  }
  const motivo = s(p.failure_reason) ?? "Saque não realizado pelo provedor.";
  const r = await repo.fail(saque.id, motivo);
  return r === "conflito" ? "revisao" : r === "ja_falhou" ? "sem_mudanca" : "falhou";
}

/** Saque sem withdrawal_id (timeout): candidato único por valor + chave + janela de tempo. */
export function encontrarCandidato(
  saque: SaqueRegistro,
  lista: ProviderWithdrawal[],
  jaVinculados: Set<string>,
): ProviderWithdrawal | null | "ambiguo" {
  if (!saque.enviado_em) return null;
  const envio = Date.parse(saque.enviado_em);
  const candidatos = lista.filter((w) => {
    if (jaVinculados.has(w.id)) return false;
    if (Math.round(w.amount * 100) > Math.round(saque.valor * 100)) return false; // pode ter sido ajustado para menos
    if (w.pix_key && w.pix_key.replace(/\D/g, "") !== saque.chave_pix.replace(/\D/g, "") && w.pix_key !== saque.chave_pix) return false;
    const t = w.created_at ? Date.parse(w.created_at) : NaN;
    return Number.isFinite(t) && t >= envio - 2 * 60_000 && t <= envio + 30 * 60_000;
  });
  if (candidatos.length === 0) return null;
  if (candidatos.length > 1) return "ambiguo";
  return candidatos[0];
}

export type ResumoReconciliacao = { verificados: number; concluidos: number; falhos: number; revisao: number; semMudanca: number };

/** Consulta o histórico da subconta e fecha os saques em aberto. Nunca reenvia. */
export async function reconciliarPorHistorico(opts: {
  repo: SaqueRepo;
  provider: WithdrawProvider;
  shopId: string;
  paginas?: number;
}): Promise<ResumoReconciliacao> {
  const resumo: ResumoReconciliacao = { verificados: 0, concluidos: 0, falhos: 0, revisao: 0, semMudanca: 0 };
  const abertos = (await opts.repo.listEmAberto()).filter((s) => s.status === "processing");
  if (abertos.length === 0) return resumo;

  const lista: ProviderWithdrawal[] = [];
  for (let p = 1; p <= (opts.paginas ?? 5); p++) {
    const pagina = await opts.provider.listWithdrawals(opts.shopId, p);
    lista.push(...pagina);
    if (pagina.length === 0) break;
  }
  const porId = new Map(lista.map((w) => [w.id, w]));
  const vinculados = new Set(abertos.map((s) => s.provider_withdrawal_id).filter((x): x is string => Boolean(x)));

  for (const saque of abertos) {
    resumo.verificados++;
    let w: ProviderWithdrawal | null | "ambiguo" = saque.provider_withdrawal_id ? porId.get(saque.provider_withdrawal_id) ?? null : null;
    if (!saque.provider_withdrawal_id) {
      w = encontrarCandidato(saque, lista, vinculados);
      if (w === "ambiguo") {
        await opts.repo.markReview(saque.id, "Mais de um saque compatível no histórico: conferir manualmente.");
        resumo.revisao++;
        continue;
      }
      if (w) {
        vinculados.add(w.id);
        await opts.repo.recordDispatch(saque.id, { providerId: w.id, providerStatus: w.status, valorEnviado: w.amount, taxa: w.fee, revisao: false, nota: "Vinculado pelo histórico da NexusPag." });
      }
    }
    if (!w) {
      resumo.semMudanca++;
      continue;
    }
    const st = mapearStatusProvedor(w.status);
    if (w.amount < saque.valor) await opts.repo.refundDifference(saque.id, w.amount);
    if (st === "completed") {
      const r = await opts.repo.complete(saque.id, w.id, w.fee);
      if (r === "conflito") resumo.revisao++;
      else resumo.concluidos++;
    } else if (st === "failed") {
      const r = await opts.repo.fail(saque.id, w.failure_reason ?? "Saque não realizado pelo provedor.");
      if (r === "conflito") resumo.revisao++;
      else resumo.falhos++;
    } else {
      resumo.semMudanca++;
    }
  }
  return resumo;
}
