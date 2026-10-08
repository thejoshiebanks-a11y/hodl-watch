"use client";

import { useEffect, useState } from "react";

const STALE_AFTER_SECONDS = 90;

function age(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

/** Shows only when the data is degraded: a backup source is answering, or updates have stalled. */
export function DataBanner({ provider, observedAt }: { provider: string; observedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const seen = Date.parse(observedAt);
  const seconds = Number.isFinite(seen) ? Math.max(0, Math.round((now - seen) / 1000)) : null;
  const stale = seconds !== null && seconds > STALE_AFTER_SECONDS;
  const backup = provider !== "dexscreener";

  if (!stale && !backup) return null;

  return (
    <div
      role="status"
      className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200"
    >
      <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Degraded</span>
      {stale && seconds !== null && <>Live updates paused. Last verified update {age(seconds)} ago. </>}
      {backup && <>Backup data source in use, so some details such as socials may be missing.</>}
    </div>
  );
}
