"use client";

// Fallback para erros inesperados de renderização no módulo E-Sports.
export default function EsportsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="pt-6">
      <div className="esports-state" role="alert">
        <h3>Algo deu errado ao carregar o E-Sports</h3>
        <p>Tente novamente em instantes.</p>
        <button type="button" onClick={reset} className="esports-button mt-3">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
