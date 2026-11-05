import Link from "next/link";

import { EsportsState } from "@/components/esports/bits";

export default function MatchNotFound() {
  return (
    <div className="pt-5">
      <EsportsState
        title="Partida não encontrada"
        description="Essa partida não existe ou não é de CS2."
        action={<Link href="/esports" className="esports-button">Ver partidas</Link>}
      />
    </div>
  );
}
