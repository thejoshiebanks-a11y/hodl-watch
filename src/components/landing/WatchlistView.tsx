"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/watch/device";
import { ObserveFeed } from "./ObserveFeed";
import { AlertsCard } from "./AlertsCard";
import type { WatchEntry } from "@/lib/watch/types";

function checked(iso: string | null): string {
  if (!iso) return "not checked yet";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (!Number.isFinite(s)) return "not checked yet";
  if (s < 90) return "checked just now";
  const m = Math.round(s / 60);
  if (m < 60) return `checked ${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `checked ${h}h ago` : `checked ${Math.round(h / 24)}d ago`;
}

const tone = (h: number | null) =>
  h === null
    ? "text-hodl-muted"
    : h >= 7.5
      ? "text-teal-300"
      : h >= 5.5
        ? "text-amber-300"
        : "text-rose-300";

export function WatchlistView({ onScan }: { onScan: (mint: string) => void }) {
  const [items, setItems] = useState<WatchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const device = getDeviceId();

    const request: Promise<WatchEntry[]> = device
      ? fetch("/api/watch", { headers: { "x-device-id": device } })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("list failed"))))
          .then((j: { watches: WatchEntry[] }) => j.watches)
      : Promise.reject(new Error("no device"));

    request
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleMute(mint: string, muted: boolean) {
    const device = getDeviceId();
    if (!device) return;
    setNote(null);
    setItems((cur) =>
      cur ? cur.map((w) => (w.mint === mint ? { ...w, muted } : w)) : cur,
    );
    try {
      const res = await fetch("/api/watch", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-device-id": device },
        body: JSON.stringify({ mint, muted }),
      });
      if (!res.ok) throw new Error("mute failed");
    } catch {
      setItems((cur) =>
        cur ? cur.map((w) => (w.mint === mint ? { ...w, muted: !muted } : w)) : cur,
      );
      setNote("Couldn't update that token. Try again.");
    }
  }

  async function remove(mint: string) {
    const device = getDeviceId();
    if (!device) return;
    setNote(null);
    try {
      const res = await fetch("/api/watch", {
        method: "DELETE",
        headers: { "content-type": "application/json", "x-device-id": device },
        body: JSON.stringify({ mint }),
      });
      if (!res.ok) {
        setNote("Couldn't remove that token. Try again.");
        return;
      }
      setItems((cur) => (cur ? cur.filter((w) => w.mint !== mint) : cur));
    } catch {
      setNote("Couldn't reach HODL. Check your connection.");
    }
  }

  return (
    <section className="mt-6">
      <AlertsCard />

      <ObserveFeed />

      <p className="mb-3 mt-8 text-xl font-bold">Your watchlist</p>

      {failed ? (
        <p className="hodl-card px-4 py-6 text-center text-xs text-hodl-muted">
          Watchlist is unavailable right now.
        </p>
      ) : items === null ? (
        <p className="hodl-card px-4 py-6 text-center text-xs text-hodl-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="hodl-card px-4 py-6 text-center text-sm text-hodl-muted">
          <p>No tokens yet.</p>
          <p className="mt-1 text-xs">
            Scan a token, open its Watch tab and tap Watch this token.
          </p>
        </div>
      ) : (
        <div className="hodl-card divide-y divide-white/10 overflow-hidden">
          {items.map((w) => (
            <div key={w.mint} className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => onScan(w.mint)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {w.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border-2 border-hodl-blue object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-hodl-blue bg-hodl-panel text-sm font-bold">
                    {(w.symbol ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{w.name ?? w.symbol ?? "Token"}</p>
                  <p className="truncate text-xs text-hodl-muted">
                    ${w.symbol ?? "—"} · {checked(w.lastScanAt)}{w.muted ? " · muted" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${tone(w.lastHealth)}`}>
                    {w.lastHealth === null ? "N/A" : w.lastHealth.toFixed(1)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-hodl-muted">Health</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggleMute(w.mint, !w.muted)}
                aria-label={w.muted ? `Unmute ${w.symbol ?? "token"}` : `Mute ${w.symbol ?? "token"}`}
                className={`shrink-0 p-2 text-lg ${w.muted ? "opacity-50" : ""}`}
              >
                {w.muted ? "🔕" : "🔔"}
              </button>
              <button
                type="button"
                onClick={() => remove(w.mint)}
                aria-label={`Remove ${w.symbol ?? "token"} from watchlist`}
                className="shrink-0 p-2 text-hodl-muted"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {note && <p className="mt-3 text-xs text-amber-300">{note}</p>}
    </section>
  );
}
