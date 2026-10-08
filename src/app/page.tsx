"use client";

import { useEffect, useState } from "react";
import type { ScanResponse, ScanSuccess } from "@/lib/types/scan";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { TokenView } from "@/components/terminal/TokenView";
import { Landing } from "@/components/landing/Landing";

type Data = ScanSuccess["data"];

async function requestScan(mint: string): Promise<{ data: Data } | { error: string }> {
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint }),
    });
    const body: ScanResponse = await response.json();

    if (!response.ok || !("data" in body)) {
      return { error: "error" in body ? body.error : "Unable to complete scan." };
    }
    return { data: body.data };
  } catch {
    return { error: "Unable to reach the HODL scan service." };
  }
}

export default function Home() {
  const [mint, setMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Data | null>(null);

  async function scan(value: string) {
    setError(null);

    const parsed = SolanaMintSchema.safeParse(value.trim());
    if (!parsed.success) {
      setSnapshot(null);
      setError("Enter a valid Solana mint address.");
      return;
    }

    setLoading(true);
    const result = await requestScan(parsed.data);
    setLoading(false);

    if ("data" in result) {
      setSnapshot(result.data);
    } else {
      setSnapshot(null);
      setError(result.error);
    }
  }

  // Notifications open /?token=<mint>: scan that token straight away.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) return;
    // Deferred so the scan's state updates don't run inside the effect body.
    const id = setTimeout(() => {
      window.history.replaceState(null, "", "/");
      void scan(t);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const openMint = snapshot?.market.mint;
  const fresh = snapshot?.health.caps?.some((c) => c.key === "fresh_launch") ?? false;

  useEffect(() => {
    if (!openMint) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      const result = await requestScan(openMint);
      if ("data" in result) setSnapshot(result.data);
    }, fresh ? 25_000 : 30_000);
    return () => clearInterval(id);
  }, [openMint, fresh]);

  return (
    <main className="min-h-screen overflow-x-hidden text-hodl-text">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8">
        {snapshot ? (
          <TokenView d={snapshot} onBack={() => setSnapshot(null)} />
        ) : (
          <Landing mint={mint} setMint={setMint} onScan={scan} loading={loading} error={error} />
        )}
      </div>
    </main>
  );
}
