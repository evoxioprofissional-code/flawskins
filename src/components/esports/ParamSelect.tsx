"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown, ChevronDown, Filter } from "lucide-react";

// Select que grava um parâmetro de URL (mesmo padrão do SortSelect do Market).
// Ao mudar, volta para a página 1.
export function ParamSelect({
  name,
  label,
  options,
  defaultValue,
  icon = "sort",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  icon?: "sort" | "filter";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(name) ?? defaultValue;
  const Icon = icon === "sort" ? ArrowUpDown : Filter;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(params.toString());
    if (e.target.value === defaultValue) p.delete(name);
    else p.set(name, e.target.value);
    p.delete("page");
    const s = p.toString();
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  return (
    <div className="esports-select-wrap">
      <Icon className="esports-select-icon" aria-hidden="true" />
      <select value={current} onChange={onChange} aria-label={label} className="esports-select">
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-neutral-900">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="esports-select-chevron" aria-hidden="true" />
    </div>
  );
}
