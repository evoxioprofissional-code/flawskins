"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

export function HeaderSearch() {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable)) return;
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        input.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <form action="/" className="site-header-search">
      <Search aria-hidden="true" />
      <input ref={input} type="search" name="q" placeholder="Buscar skins, facas, luvas..." aria-label="Buscar skins" />
      <kbd aria-hidden="true">/</kbd>
    </form>
  );
}
