import { formatBRL } from "@/lib/format";
import type { PrecoRef } from "@/lib/precos";

// Comparação com os principais mercados. O próprio anúncio entra na lista,
// na posição do seu preço, para mostrar de cara se está barato ou caro.
const CURADOS = ["buff", "csfloat", "skinport", "steam", "dmarket", "waxpeer"];

export function MercadosComparacao({ preco, dados }: { preco: number; dados: PrecoRef }) {
  const mercados = (dados?.mercados ?? []).filter((m) => CURADOS.includes(m.source));
  if (mercados.length === 0) return null;

  const linhas = [
    ...mercados.map((m) => ({ chave: m.source, nome: m.nome, preco: m.price, proprio: false })),
    { chave: "anuncio", nome: "Este anúncio", preco, proprio: true },
  ].sort((a, b) => a.preco - b.preco);

  const maior = Math.max(...linhas.map((l) => l.preco));
  const menorMercado = Math.min(...mercados.map((m) => m.price));
  const buff = dados?.buff ?? null;
  const diff = buff ? ((preco - buff) / buff) * 100 : null;
  const tom = diff == null ? null : diff <= -2 ? "bom" : diff >= 2 ? "caro" : "justo";

  return (
    <section className="skin-panel" aria-label="Preços de referência">
      <div className="skin-panel-head">
        <h2>Preços de referência</h2>
        {diff != null && (
          <span className="skin-delta" data-tone={tom} title="Comparado ao Buff163">
            {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(diff)}% vs Buff
          </span>
        )}
      </div>
      <ul className="skin-markets">
        {linhas.map((l) => (
          <li key={l.chave} data-own={l.proprio || undefined} data-best={(!l.proprio && l.preco === menorMercado) || undefined}>
            <span className="skin-market-name">{l.nome}</span>
            <span className="skin-market-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(6, (l.preco / maior) * 100)}%` }} />
            </span>
            <strong>{formatBRL(l.preco)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
