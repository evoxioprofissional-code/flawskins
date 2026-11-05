import { Info } from "lucide-react";

import { RifaForm } from "@/components/rifas/RifaForm";

// Criar rifa (usuário): sem conectar conta. As cotas são pagas via Pix para a
// Cloud, e o valor líquido é repassado para a chave Pix informada no formulário.
export function CriarRifaPainel({ percentual }: { percentual: number }) {
  return (
    <div>
      <div className="mb-5 flex gap-3 rounded-xl border border-[#1f2630] bg-[#11161e] px-4 py-3 text-sm text-zinc-300">
        <Info className="mt-0.5 size-4 shrink-0 text-[#43a8ff]" aria-hidden="true" />
        <p>
          Os compradores pagam as cotas por Pix e a Cloud recebe. Quando a rifa terminar, repassamos o valor
          arrecadado para a sua chave Pix, descontada a comissão de{" "}
          <strong className="text-zinc-100">{percentual}% por cota</strong>. Criar é grátis.
        </p>
      </div>
      <RifaForm usuario />
    </div>
  );
}
