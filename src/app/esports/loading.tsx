// Esqueleto enquanto os dados da PandaScore carregam (mesmas medidas dos cards).
export default function EsportsLoading() {
  return (
    <div className="pt-6" aria-busy="true" aria-label="Carregando">
      <div className="mb-5 h-5 w-48 animate-pulse rounded bg-[#171c25]" />
      <div className="esports-list">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl border border-[#1d242e] bg-[#10151c]" />
        ))}
      </div>
    </div>
  );
}
