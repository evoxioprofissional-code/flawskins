// Logo da Steam (monocromático, herda a cor do texto).
export function SteamIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.98 0C5.66 0 .49 4.88.02 11.07l6.44 2.66a3.39 3.39 0 0 1 1.92-.59l.13.01 2.86-4.15v-.06a4.52 4.52 0 1 1 4.53 4.52h-.1l-4.09 2.92.01.1a3.4 3.4 0 0 1-6.74.62L.43 15.27A12 12 0 1 0 11.98 0zM7.54 18.21l-1.47-.61a2.55 2.55 0 0 0 4.71-1.94 2.56 2.56 0 0 0-3.51-1.43l1.52.63a1.88 1.88 0 1 1-1.44 3.47l.19-.12zm9.97-9.75a3.01 3.01 0 1 0-6.02 0 3.01 3.01 0 0 0 6.02 0zm-5.27 0a2.26 2.26 0 1 1 4.52 0 2.26 2.26 0 0 1-4.52 0z" />
    </svg>
  );
}
