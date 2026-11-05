import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Clock, Wallet } from "lucide-react";

import { getUser } from "@/lib/auth";
import { meuExtrato, resumoCarteira, type Movimento, type Saque } from "@/actions/carteira";
import { CarteiraAcoes } from "@/components/carteira/CarteiraAcoes";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = { title: "Carteira — Cloud Skins" };
export const dynamic = "force-dynamic";

const ROTULO: Record<Movimento["tipo"], string> = {
  deposito: "Depósito",
  compra_cota: "Compra de cotas",
  ganho_rifa: "Ganhos de rifa",
  saque: "Saque",
  estorno_saque: "Estorno de saque",
  ajuste: "Ajuste",
};

const SAQUE_STATUS: Record<Saque["status"], string> = {
  pendente: "Em análise",
  pago: "Pago",
  recusado: "Recusado",
};

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );

export default async function CarteiraPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/carteira");

  const [resumo, { movimentos, saques }] = await Promise.all([resumoCarteira(), meuExtrato()]);

  if (!resumo) {
    return (
      <>
        <PageHeader title="Carteira" backTo="/" />
        <div className="cloud-page-wide py-8">
          <div className="carteira-vazio">
            <Wallet aria-hidden="true" />
            <p>A carteira ainda não está disponível. Tente novamente em instantes.</p>
          </div>
        </div>
      </>
    );
  }

  const saquesPendentes = saques.filter((s) => s.status === "pendente");

  return (
    <>
      <PageHeader title="Carteira" subtitle="Seu saldo na Cloud: depósitos, ganhos de rifas e saques." backTo="/" />

      <div className="cloud-page-wide carteira">
        <section className="carteira-saldo" aria-label="Saldo">
          <div>
            <p className="carteira-label">Saldo disponível</p>
            <p className="carteira-valor">{formatBRL(resumo.saldo)}</p>
            <p className="carteira-sub">Use para comprar cotas de rifa ou saque por Pix.</p>
          </div>
          <CarteiraAcoes saldo={resumo.saldo} />
        </section>

        <div className="carteira-cards">
          <div className="carteira-card">
            <p className="carteira-label">A receber das rifas</p>
            <p className="carteira-card-valor">{formatBRL(resumo.aReceber)}</p>
            <p className="carteira-sub">
              Valor líquido das suas rifas em andamento. Entra no saldo quando a rifa termina.{" "}
              <Link href="/rifas/minhas">Ver minhas rifas</Link>
            </p>
          </div>
          <div className="carteira-card">
            <p className="carteira-label">Saques em análise</p>
            <p className="carteira-card-valor">
              {formatBRL(saquesPendentes.reduce((s, x) => s + x.valor, 0))}
            </p>
            <p className="carteira-sub">
              {saquesPendentes.length
                ? `${saquesPendentes.length} pedido(s) aguardando o envio do Pix.`
                : "Nenhum saque aguardando."}
            </p>
          </div>
        </div>

        {saques.length > 0 && (
          <section className="carteira-section" aria-label="Saques">
            <h2>Saques</h2>
            <ul className="carteira-lista">
              {saques.map((s) => (
                <li key={s.id}>
                  <span className="carteira-ico" data-tipo="saida">
                    <Clock aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="carteira-item-titulo">Saque para {s.chave_pix}</p>
                    <p className="carteira-item-data">
                      {data(s.created_at)}
                      {s.motivo ? ` · ${s.motivo}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="carteira-item-valor">{formatBRL(s.valor)}</p>
                    <span className="carteira-status" data-status={s.status}>
                      {SAQUE_STATUS[s.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="carteira-section" aria-label="Extrato">
          <h2>Extrato</h2>
          {movimentos.length === 0 ? (
            <div className="carteira-vazio">
              <Wallet aria-hidden="true" />
              <p>Nenhuma movimentação ainda. Adicione saldo ou crie uma rifa para começar.</p>
            </div>
          ) : (
            <ul className="carteira-lista">
              {movimentos.map((m) => {
                const entrada = m.valor > 0;
                return (
                  <li key={m.id}>
                    <span className="carteira-ico" data-tipo={entrada ? "entrada" : "saida"}>
                      {entrada ? <ArrowDownLeft aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="carteira-item-titulo">{ROTULO[m.tipo]}</p>
                      <p className="carteira-item-data">
                        {m.descricao} · {data(m.created_at)}
                      </p>
                    </div>
                    <p className="carteira-item-valor" data-tipo={entrada ? "entrada" : "saida"}>
                      {entrada ? "+" : "−"} {formatBRL(Math.abs(m.valor))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
