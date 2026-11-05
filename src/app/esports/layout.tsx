import { EsportsSidebar } from "@/components/esports/EsportsSidebar";

// Estrutura do Cloud E-Sports: mesma grade/espaçamento do Market
// (sidebar à esquerda + área principal). Cada página traz seu cabeçalho.
export default function EsportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="esports">
      <aside>
        <EsportsSidebar />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
