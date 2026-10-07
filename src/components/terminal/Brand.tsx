export function HodlLogo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="HODL">
      <defs>
        <linearGradient id="hodl-g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7ff3ff" />
          <stop offset="1" stopColor="#1f8bff" />
        </linearGradient>
        <linearGradient id="hodl-f" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19232f" />
          <stop offset="1" stopColor="#04070b" />
        </linearGradient>
      </defs>
      <path d="M24 2.5 42.5 13v22L24 45.5 5.5 35V13z" fill="url(#hodl-f)" />
      <path d="M24 2.5 42.5 13v22L24 45.5 5.5 35V13z" stroke="url(#hodl-g)" strokeWidth="1.6" />
      <path d="M17 14v20M31 14v20" stroke="url(#hodl-g)" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M17 25h4.5l2.5-6 3 11 2-5H31" stroke="url(#hodl-g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SolanaMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Solana">
      <defs>
        <linearGradient id="sol-g" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9945ff" />
          <stop offset="1" stopColor="#14f195" />
        </linearGradient>
      </defs>
      <path fill="url(#sol-g)" d="M5 16.5h14.5l-2 2.5H3zM5 5h14.5l-2 2.5H3zM3 10.75h14.5l2 2.5H5z" />
    </svg>
  );
}

const PATHS = {
  coins: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v8M9.5 10.5H13a1.5 1.5 0 0 1 0 3h-3",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  bars: "M5 20V10M12 20V4M19 20v-7",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5M17 10a2.5 2.5 0 1 0 0-5M17 14.5c2.5 0 4 1.5 4 4.5",
  flow: "M4 8h13l-3-3M20 16H7l3 3",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z",
  chart: "M3 17l5-6 4 3 8-9M3 21h18",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
  copy: "M9 9h10v11H9zM5 15V4h10",
  check: "M5 12l4 4 10-10",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  fire: "M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z",
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  dots: "M6 12h.01M12 12h.01M18 12h.01",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8",
  chevron: "M9 6l6 6-6 6",
} as const;

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: keyof typeof PATHS;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
