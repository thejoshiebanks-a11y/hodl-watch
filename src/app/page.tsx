"use client";

import { useState } from "react";
import type { ScanResponse, ScanSuccess } from "@/lib/types/scan";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { TokenView } from "@/components/terminal/TokenView";

export default function Home() {
  const [mint, setMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ScanSuccess["data"] | null>(null);

  async function handleScan() {
    setError(null);

    const result = SolanaMintSchema.safeParse(mint);

    if (!result.success) {
      setSnapshot(null);
      setError("Enter a valid Solana mint address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint: result.data }),
      });

      const data: ScanResponse = await response.json();

      if (!response.ok || !("data" in data)) {
        setSnapshot(null);
        setError("error" in data ? data.error : "Unable to complete scan.");
        return;
      }

      setSnapshot(data.data);
    } catch {
      setSnapshot(null);
      setError("Unable to reach the HODL scan service.");
    } finally {
      setLoading(false);
    }
  }

  if (snapshot) {
    return (
      <main className="min-h-screen overflow-x-hidden text-hodl-text">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8">
          <TokenView d={snapshot} onBack={() => setSnapshot(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden text-hodl-text">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hodl-blue text-sm font-black">
              H
            </div>
            <span className="text-sm font-semibold tracking-[0.18em]">HODL</span>
          </div>
          <span className="rounded-full border border-hodl-line px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-hodl-muted">
            Scan
          </span>
        </header>

        <div className="flex gap-2">
          <input
            suppressHydrationWarning
            type="text"
            value={mint}
            onChange={(event) => setMint(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleScan();
            }}
            placeholder="Paste Solana mint address"
            className="min-w-0 flex-1 rounded-xl border border-hodl-line bg-hodl-panel px-4 py-3 text-sm outline-none focus:border-hodl-blue"
          />
          <button
            type="button"
            onClick={handleScan}
            disabled={loading}
            className="rounded-xl bg-hodl-blue px-5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Scan"}
          </button>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        {!snapshot && !loading && (
          <p className="py-16 text-center text-sm text-hodl-muted">
            You trade. HODL watches. Paste a Solana mint to begin.
          </p>
        )}

        <footer className="py-8 text-center text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
          HODL · Health. Observe. Detect. Live.
        </footer>
      </div>
    </main>
  );
}
