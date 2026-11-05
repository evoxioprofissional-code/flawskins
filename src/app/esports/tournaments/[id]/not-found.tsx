import Link from "next/link";

import { EsportsState } from "@/components/esports/bits";

export default function TournamentNotFound() {
  return (
    <div className="pt-5">
      <EsportsState
        title="Campeonato não encontrado"
        description="Esse campeonato não existe ou não é de CS2."
        action={<Link href="/esports/tournaments" className="esports-button">Ver campeonatos</Link>}
      />
    </div>
  );
}
