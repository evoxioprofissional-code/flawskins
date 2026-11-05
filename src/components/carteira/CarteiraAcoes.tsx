"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, X } from "lucide-react";

import { iniciarDeposito, solicitarSaque } from "@/actions/carteira";
import type { PixPagamento } from "@/actions/rifas";
import { PixModal } from "@/components/rifas/PixModal";
import { formatBRL } from "@/lib/format";
import {
  LIMITES_PADRAO,
  PIX_KEY_LABEL,
  PIX_KEY_TYPES,
  validarPedido,
  type PedidoSaque,
  type PixKeyType,
} from "@/lib/nexuspag/saques";

const SUGESTOES = [10, 25, 50, 100];

const parse = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));

// Botões "Adicionar saldo" (Pix) e "Sacar" da página Carteira.
export function CarteiraAcoes({ saldo }: { saldo: number }) {
  const [aberto, setAberto] = useState<"deposito" | "saque" | null>(null);

  return (
    <>
      <div className="carteira-acoes">
        <button type="button" className="carteira-btn carteira-btn-primary" onClick={() => setAberto("deposito")}>
          <ArrowDownToLine aria-hidden="true" /> Adicionar saldo
        </button>
        <button
          type="button"
          className="carteira-btn"
          onClick={() => setAberto("saque")}
          disabled={saldo < LIMITES_PADRAO.minimo}
          title={saldo < LIMITES_PADRAO.minimo ? "Saque mínimo de R$ 10,00" : undefined}
        >
          <ArrowUpFromLine aria-hidden="true" /> Sacar
        </button>
      </div>

      {aberto === "deposito" && <Deposito onClose={() => setAberto(null)} />}
      {aberto === "saque" && <SaqueForm saldo={saldo} onClose={() => setAberto(null)} />}
    </>
  );
}

function Painel({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="carteira-modal" onClick={onClose}>
      <div className="carteira-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="carteira-modal-head">
          <h2>{titulo}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Deposito({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [valor, setValor] = useState("25");
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<PixPagamento | null>(null);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    const v = parse(valor);
    if (!(v >= 5)) return toast.error("O depósito mínimo é R$ 5,00.");
    if (v > 5000) return toast.error("O depósito máximo é R$ 5.000,00.");
    setBusy(true);
    const res = await iniciarDeposito(v);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setPix(res.data);
  }

  if (pix) {
    return (
      <PixModal
        pix={pix}
        mensagemSucesso={`${formatBRL(pix.valor)} adicionados ao seu saldo.`}
        onClose={() => {
          setPix(null);
          onClose();
          router.refresh();
        }}
      />
    );
  }

  return (
    <Painel titulo="Adicionar saldo" onClose={onClose}>
      <form onSubmit={gerar} className="grid gap-4">
        <div className="carteira-chips">
          {SUGESTOES.map((s) => (
            <button key={s} type="button" data-active={parse(valor) === s} onClick={() => setValor(String(s))}>
              {formatBRL(s)}
            </button>
          ))}
        </div>
        <label className="carteira-field">
          <span>Valor</span>
          <div>
            <em>R$</em>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor do depósito" />
          </div>
        </label>
        <p className="carteira-hint">Você paga por Pix e o valor entra no saldo assim que o pagamento é confirmado. Mínimo R$ 5,00.</p>
        <button type="submit" className="carteira-btn carteira-btn-primary" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Gerar Pix
        </button>
      </form>
    </Painel>
  );
}

const PLACEHOLDER: Record<PixKeyType, string> = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  email: "voce@exemplo.com",
  phone: "(11) 91234-5678",
  random: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
};

function SaqueForm({ saldo, onClose }: { saldo: number; onClose: () => void }) {
  const router = useRouter();
  const [valor, setValor] = useState(saldo >= LIMITES_PADRAO.minimo ? Math.min(saldo, LIMITES_PADRAO.maximo).toFixed(2).replace(".", ",") : "");
  const [tipo, setTipo] = useState<PixKeyType>("cpf");
  const [chave, setChave] = useState("");
  const [revisao, setRevisao] = useState<PedidoSaque | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [busy, setBusy] = useState(false);

  function revisar(e: React.FormEvent) {
    e.preventDefault();
    const v = validarPedido({ valor: parse(valor), tipo, chave });
    if (!v.ok) return toast.error(v.erro);
    if (v.pedido.valor > saldo) return toast.error("Valor maior que o seu saldo.");
    setConfirmado(false);
    setRevisao(v.pedido);
  }

  async function confirmar() {
    if (!revisao || !confirmado) return;
    setBusy(true);
    const res = await solicitarSaque({ valor: revisao.valor, tipo: revisao.tipo, chave: revisao.chave, confirmado });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(
      res.data.status === "completed"
        ? "Saque enviado por Pix!"
        : res.data.enviado
          ? "Saque enviado: aguardando confirmação do Pix."
          : "Saque solicitado! Ele entra na fila e é enviado por Pix.",
    );
    onClose();
    router.refresh();
  }

  if (revisao) {
    return (
      <Painel titulo="Confirmar saque" onClose={onClose}>
        <div className="grid gap-4">
          <dl className="carteira-revisao">
            <div>
              <dt>Valor</dt>
              <dd>{formatBRL(revisao.valor)}</dd>
            </div>
            <div>
              <dt>Tipo da chave</dt>
              <dd>{PIX_KEY_LABEL[revisao.tipo]}</dd>
            </div>
            <div>
              <dt>Chave Pix</dt>
              <dd className="break-all">{revisao.chave}</dd>
            </div>
          </dl>
          <label className="carteira-check">
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
            <span>Confirmo que a chave Pix é minha e que os dados estão corretos. Pix enviado não pode ser desfeito.</span>
          </label>
          <div className="carteira-acoes">
            <button type="button" className="carteira-btn" onClick={() => setRevisao(null)} disabled={busy}>
              Voltar
            </button>
            <button type="button" className="carteira-btn carteira-btn-primary" onClick={confirmar} disabled={!confirmado || busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Confirmar saque
            </button>
          </div>
        </div>
      </Painel>
    );
  }

  return (
    <Painel titulo="Sacar saldo" onClose={onClose}>
      <form onSubmit={revisar} className="grid gap-4">
        <label className="carteira-field">
          <span>Valor (disponível: {formatBRL(saldo)})</span>
          <div>
            <em>R$</em>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor do saque" />
          </div>
        </label>
        <div className="carteira-field">
          <span>Tipo da chave Pix</span>
          <div className="carteira-chips carteira-chips-tipo" role="radiogroup" aria-label="Tipo da chave Pix">
            {PIX_KEY_TYPES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipo === t} data-active={tipo === t} onClick={() => setTipo(t)}>
                {PIX_KEY_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <label className="carteira-field">
          <span>Chave Pix ({PIX_KEY_LABEL[tipo]})</span>
          <div>
            <input
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder={PLACEHOLDER[tipo]}
              inputMode={tipo === "cpf" || tipo === "cnpj" || tipo === "phone" ? "numeric" : tipo === "email" ? "email" : "text"}
              autoComplete="off"
              maxLength={140}
              aria-label="Chave Pix"
            />
          </div>
        </label>
        <p className="carteira-hint">
          Mínimo {formatBRL(LIMITES_PADRAO.minimo)} e máximo {formatBRL(LIMITES_PADRAO.maximo)} por saque, um saque por vez. O valor fica reservado no seu saldo; se o saque não for concluído, ele volta para a carteira.
        </p>
        <button type="submit" className="carteira-btn carteira-btn-primary">
          Revisar saque
        </button>
      </form>
    </Painel>
  );
}
