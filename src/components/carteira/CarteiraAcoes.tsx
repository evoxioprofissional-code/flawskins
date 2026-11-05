"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, X } from "lucide-react";

import { iniciarDeposito, solicitarSaque } from "@/actions/carteira";
import type { PixPagamento } from "@/actions/rifas";
import { PixModal } from "@/components/rifas/PixModal";
import { formatBRL } from "@/lib/format";

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
          disabled={saldo < 10}
          title={saldo < 10 ? "Saque mínimo de R$ 10,00" : undefined}
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

function SaqueForm({ saldo, onClose }: { saldo: number; onClose: () => void }) {
  const router = useRouter();
  const [valor, setValor] = useState(saldo >= 10 ? saldo.toFixed(2).replace(".", ",") : "");
  const [chave, setChave] = useState("");
  const [busy, setBusy] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = parse(valor);
    if (!(v >= 10)) return toast.error("O saque mínimo é R$ 10,00.");
    if (v > saldo) return toast.error("Valor maior que o seu saldo.");
    if (chave.trim().length < 5) return toast.error("Informe a chave Pix.");
    setBusy(true);
    const res = await solicitarSaque(v, chave);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Saque solicitado! Você recebe por Pix após a aprovação.");
    onClose();
    router.refresh();
  }

  return (
    <Painel titulo="Sacar saldo" onClose={onClose}>
      <form onSubmit={enviar} className="grid gap-4">
        <label className="carteira-field">
          <span>Valor (disponível: {formatBRL(saldo)})</span>
          <div>
            <em>R$</em>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor do saque" />
          </div>
        </label>
        <label className="carteira-field">
          <span>Chave Pix</span>
          <div>
            <input
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              autoComplete="off"
              maxLength={140}
              aria-label="Chave Pix"
            />
          </div>
        </label>
        <p className="carteira-hint">O valor sai do seu saldo agora e é enviado por Pix após a aprovação. Se o saque for recusado, o valor volta para a carteira.</p>
        <button type="submit" className="carteira-btn carteira-btn-primary" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Solicitar saque
        </button>
      </form>
    </Painel>
  );
}
