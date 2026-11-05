// Esqueletos de carregamento: usam as MESMAS classes/medidas das páginas reais,
// para a troca esqueleto → conteúdo não "pular". Aparecem na hora do clique
// (o Next pré-carrega o loading.tsx de cada rota) enquanto o servidor responde.

function Bar({ w = "100%", h = 12, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <span className={`sk ${className}`} style={{ width: w, height: h }} aria-hidden="true" />;
}

function Wrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-label={label} role="status">
      {children}
    </div>
  );
}

/** Market: sidebar de filtros + categorias + grade de cards. */
export function MarketSkeleton() {
  return (
    <Wrap label="Carregando skins">
      <div className="marketplace">
        <aside className="marketplace-sidebar sk-hide-mobile">
          <div className="marketplace-filters sk-filters">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="sk-filter-row">
                <Bar w="45%" h={13} />
                {i < 2 && <Bar h={36} className="mt-3" />}
              </div>
            ))}
          </div>
        </aside>
        <div className="marketplace-results">
          <div className="marketplace-category-row">
            {Array.from({ length: 7 }, (_, i) => (
              <Bar key={i} w={72} h={30} />
            ))}
          </div>
          <div className="marketplace-toolbar">
            <Bar w={170} h={16} />
            <Bar w={150} h={38} className="ml-auto" />
          </div>
          <div className="marketplace-feed">
            <div className="skin-grid">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="skin-card sk-card">
                  <div className="skin-card-wear">
                    <Bar w={28} h={18} />
                    <Bar w={52} h={12} />
                  </div>
                  <div className="skin-card-art sk-art" />
                  <Bar w="40%" h={12} />
                  <Bar w="70%" h={15} className="mt-2" />
                  <div className="skin-card-price">
                    <Bar w="45%" h={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

/** Página da skin: palco da imagem + coluna de compra. */
export function SkinSkeleton() {
  return (
    <Wrap label="Carregando skin">
      <div className="skin-page">
        <div className="skin-topbar">
          <Bar w={82} h={34} />
          <Bar w={220} h={13} />
        </div>
        <div className="skin-layout">
          <div className="skin-stage">
            <div className="skin-stage-art sk-art" />
            <div className="skin-wear">
              <Bar w="30%" h={14} />
              <Bar h={8} className="mt-4" />
            </div>
          </div>
          <div className="skin-side">
            <div className="skin-buy">
              <Bar w="55%" h={22} />
              <Bar w="40%" h={13} className="mt-4" />
              <Bar w="75%" h={30} className="mt-2" />
              <Bar w="45%" h={34} className="mt-6" />
              <Bar h={52} className="mt-5" />
              <Bar h={46} className="mt-3" />
            </div>
            <div className="skin-seller">
              <Bar w={44} h={44} className="sk-round" />
              <div className="grid flex-1 gap-2">
                <Bar w="30%" h={10} />
                <Bar w="55%" h={14} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

/** Páginas com cabeçalho padrão (PageHeader) + conteúdo em grade/painéis. */
export function PageSkeleton({ cards = 6, label = "Carregando" }: { cards?: number; label?: string }) {
  return (
    <Wrap label={label}>
      <div className="cloud-page-wide mx-auto">
        <div className="cloud-page-heading">
          <Bar w={220} h={26} />
          <Bar w={320} h={13} className="mt-3" />
        </div>
      </div>
      <div className="cloud-page-wide mx-auto pb-10 pt-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3.5">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="cloud-panel overflow-hidden">
              <div className="sk-art" style={{ height: 150 }} />
              <div className="grid gap-2 p-4">
                <Bar w="70%" h={15} />
                <Bar w="45%" h={12} />
                <Bar h={8} className="mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Wrap>
  );
}
