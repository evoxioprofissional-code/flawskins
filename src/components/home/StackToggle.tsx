"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function StackToggle() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="marketplace-stack">
      <input type="checkbox" checked={params.get("unstacked") === "1"} onChange={(event) => {
        const next = new URLSearchParams(params);
        if (event.target.checked) next.set("unstacked", "1");
        else next.delete("unstacked");
        router.push(next.size ? `/?${next}` : "/", { scroll: false });
      }} />
      Não empilhadas
    </label>
  );
}
