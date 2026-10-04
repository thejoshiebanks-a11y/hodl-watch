"use client";

import { useState } from "react";
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

export function Watch({ d }: { d: Data }) {
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
        Saved on this device only. Live Watch rules and alerts arrive with v0.2.
      </p>
    </section>
  );
}

