"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/watch/device";
import type { ScanSuccess } from "@/lib/types/scan";

type Data = ScanSuccess["data"];

const NA = "N/A";
const card = "hodl-card";

function price(p: number | null) {
  if (p === null || p <= 0) return NA;
  return p >= 1 ? p.toFixed(2) : p.toFixed(Math.min(10, Math.ceil(-Math.log10(p)) + 3));
}

export function Evidence({ d }: { d: Data }) {
  const seen = d.factors.filter((f) => f.status === "AVAILABLE").length;

  return (
    <section className={card}>
      <div className="flex justify-between border-b border-hodl-line px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
        <span>Why this score</span>
        <span>
          {seen}/{d.factors.length} observed
        </span>
      </div>
      <div className="divide-y divide-hodl-line">
        {d.factors.map((f) => (
          <div key={f.key} className="px-4 py-3">
            <div className="flex justify-between gap-3 text-sm">
              <span>
                <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-hodl-muted">
                  {f.group}
                </span>
                {f.label}
              </span>
              <span className={f.status === "AVAILABLE" ? "text-hodl-cyan" : "text-hodl-muted"}>
                {f.status === "AVAILABLE" && f.value !== null ? f.value.toFixed(1) : "N/A"}
              </span>
            </div>
            <p className="mt-1 text-xs text-hodl-muted">{f.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type Mark = {
  mint: string;
  symbol: string | null;
  price: number | null;
  health: number | null;
  at: string;
};

const MARKS_KEY = "hodl:marks";

function loadMarks(): Mark[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MARKS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMarks(marks: Mark[]) {
  try {
    localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
  } catch {
    /* storage unavailable */
  }
}

function MarkCard({ d }: { d: Data }) {
  const mint = d.market.mint;
  const [mark, setMark] = useState<Mark | null>(
    () => loadMarks().find((x) => x.mint === mint) ?? null,
  );

  function set() {
    const next: Mark = {
      mint,
      symbol: d.market.symbol,
      price: d.market.priceUsd,
      health: d.health.score,
      at: new Date().toISOString(),
    };
    saveMarks([...loadMarks().filter((x) => x.mint !== mint), next]);
    setMark(next);
  }

  function clear() {
    saveMarks(loadMarks().filter((x) => x.mint !== mint));
    setMark(null);
  }

  const now = d.market.priceUsd;
  const move =
    mark && mark.price && now !== null ? ((now - mark.price) / mark.price) * 100 : null;
  const delta =
    mark && mark.health !== null && d.health.score !== null
      ? d.health.score - mark.health
      : null;

  const rows: [string, string][] = mark
    ? [
        ["Marked", mark.at.slice(0, 16).replace("T", " ") + " UTC"],
        [
          "Price",
          `$${price(mark.price)} → $${price(now)}${move === null ? "" : ` (${move >= 0 ? "+" : ""}${move.toFixed(2)}%)`}`,
        ],
        [
          "Health",
          `${mark.health === null ? NA : mark.health.toFixed(1)} → ${d.health.score === null ? NA : d.health.score.toFixed(1)}${delta === null ? "" : ` (${delta >= 0 ? "+" : ""}${delta.toFixed(1)})`}`,
        ],
      ]
    : [];

  return (
    <section className={`${card} p-4`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">Your mark</p>
      {!mark ? (
        <>
          <p className="mt-3 text-sm text-hodl-muted">
            Save this token&apos;s price and Health right now. Scan it again later and HODL shows
            what changed since your mark.
          </p>
          <button
            type="button"
            onClick={set}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-hodl-blue to-blue-500 py-3 text-sm font-semibold"
          >
            Set my mark
          </button>
        </>
      ) : (
        <>
          <div className="mt-3 divide-y divide-hodl-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <span className="text-hodl-muted">{k}</span>
                <span className="text-right">{v}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={clear}
            className="mt-4 w-full rounded-xl border border-hodl-line py-3 text-sm text-hodl-muted"
          >
            Clear mark
          </button>
        </>
      )}
      <p className="mt-4 text-[11px] text-hodl-muted">
        Saved on this device only.
      </p>
    </section>
  );
}


function watchPayload(d: Data) {
  const img = d.market.imageUrl;
  return {
    mint: d.market.mint,
    symbol: d.market.symbol,
    name: d.market.name,
    imageUrl: typeof img === "string" && img.startsWith("http") ? img : null,
    health: d.health.score,
  };
}

function WatchToggle({ d }: { d: Data }) {
  const mint = d.market.mint;
  const [watching, setWatching] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const device = getDeviceId();

    const request: Promise<boolean> = device
      ? fetch("/api/watch", { headers: { "x-device-id": device } })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("list failed"))))
          .then(async (j: { watches: { mint: string }[] }) => {
            const on = j.watches.some((w) => w.mint === mint);
            if (on) {
              await fetch("/api/watch", {
                method: "POST",
                headers: { "content-type": "application/json", "x-device-id": device },
                body: JSON.stringify(watchPayload(d)),
              }).catch(() => undefined);
            }
            return on;
          })
      : Promise.reject(new Error("no device"));

    request
      .then((on) => {
        if (!cancelled) {
          setWatching(on);
          setNote(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWatching(false);
          setNote("Watchlist is unavailable right now.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [d, mint]);

  async function toggle() {
    const device = getDeviceId();
    if (!device || busy || watching === null) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/watch", {
        method: watching ? "DELETE" : "POST",
        headers: { "content-type": "application/json", "x-device-id": device },
        body: JSON.stringify(watching ? { mint } : watchPayload(d)),
      });
      if (res.status === 409) {
        setNote("Watchlist is full (25 tokens). Remove one first.");
      } else if (!res.ok) {
        setNote("Couldn't update the watchlist. Try again.");
      } else {
        setWatching(!watching);
      }
    } catch {
      setNote("Couldn't reach HODL. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${card} p-4`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">Watchlist</p>
      <p className="mt-3 text-sm text-hodl-muted">
        {watching
          ? "This token is on your watchlist. HODL re-scans it on a schedule and alerts you when something material changes, if alerts are on."
          : "Add this token to your watchlist to keep it one tap away."}
      </p>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || watching === null}
        className={
          watching
            ? "mt-4 w-full rounded-xl border border-hodl-cyan/50 bg-hodl-cyan/10 py-3 text-sm font-semibold text-hodl-cyan disabled:opacity-60"
            : "mt-4 w-full rounded-xl bg-gradient-to-r from-hodl-blue to-blue-500 py-3 text-sm font-semibold disabled:opacity-60"
        }
      >
        {watching === null ? "Checking…" : watching ? "Watching ✓ · tap to remove" : "Watch this token"}
      </button>
      {note && <p className="mt-3 text-xs text-amber-300">{note}</p>}
      <p className="mt-3 text-[11px] text-hodl-muted">
        Saved to this device&apos;s watchlist. No account or wallet needed.
      </p>
    </section>
  );
}

export function Watch({ d }: { d: Data }) {
  return (
    <div className="space-y-4">
      <WatchToggle d={d} />
      <MarkCard d={d} />
    </div>
  );
}
