"use client";

import { useState } from "react";

export function ShareButton({ mint, symbol }: { mint: string; symbol: string | null }) {
  const [done, setDone] = useState(false);

  async function share() {
    const url = `${window.location.origin}/t/${mint}`;
    const title = `${symbol ? `$${symbol}` : "Token"} on HODL`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // they closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // nothing else to try
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this token"
      className="flex h-9 w-9 items-center justify-center rounded-full text-hodl-muted transition-colors hover:text-hodl-cyan"
    >
      {done ? (
        <span className="text-sm text-emerald-300">✓</span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
      )}
    </button>
  );
}
