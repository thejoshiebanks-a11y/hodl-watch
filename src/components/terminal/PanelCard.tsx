"use client";

import { useEffect, useState } from "react";
import type { ScanSuccess } from "@/lib/types/scan";
import { buildPanel } from "@/health/score/panel";
import { holderTrendFactor } from "@/health/factors/trend";
import type { TrendResult } from "@/lib/watch/trend";

type Data = ScanSuccess["data"];

const tone = (n: number | null) =>
  n === null
    ? "text-slate-400"
    : n >= 7
      ? "text-emerald-300"
      : n >= 4
        ? "text-amber-300"
        : "text-red-300";

function Tile({
  label,
  score,
  confidence,
}: {
  label: string;
  score: number | null;
  confidence: number;
}) {
  return (
    <div className="flex-1 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-hodl-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${tone(score)}`}>
        {score === null ? "N/A" : score.toFixed(1)}
        <span className="text-xs font-normal text-hodl-muted"> /10</span>
      </p>
      {score !== null && confidence < 0.5 && (
        <p className="mt-0.5 text-[10px] text-amber-300">Low data</p>
      )}
    </div>
  );
}

export function PanelCard({ d }: { d: Data }) {
  const mint = d.market.mint;
  const [found, setFound] = useState<{ mint: string; holders: TrendResult | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/token-trend?mint=${encodeURIComponent(mint)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { holders?: TrendResult | null } | null) => {
        if (!cancelled) setFound({ mint, holders: j?.holders ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mint]);

  const trend = found?.mint === mint ? found.holders : null;

  const p = buildPanel({
    factors: d.factors,
    extraFactors: trend ? [holderTrendFactor(trend)] : [],
    caps: d.health.caps ?? [],
    coverage: d.health.coverage,
    missingCritical: d.health.missingCritical,
  });

  const pill =
    p.confidence === "High"
      ? "text-emerald-300"
      : p.confidence === "Medium"
        ? "text-amber-300"
        : "text-red-300";

  return (
    <section className="hodl-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-muted">
          Panel verdict
        </p>
        <span className={`rounded-full border border-hodl-line px-2.5 py-0.5 text-[10px] ${pill}`}>
          {p.confidence} confidence
        </span>
      </div>

      <p className="mt-3 text-lg font-bold leading-snug">{p.verdict}</p>

      <div className="mt-3 flex gap-3">
        <Tile label="Safety" score={p.safety} confidence={p.safetyConfidence} />
        <Tile label="Setup" score={p.setup} confidence={p.setupConfidence} />
      </div>

      {p.reasons.length > 0 && (
        <ul className="mt-4 space-y-2">
          {p.reasons.slice(0, 5).map((r, i) => (
            <li key={i} className="flex gap-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  r.tone === "good" ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <p className="text-xs text-hodl-muted">{r.text}</p>
            </li>
          ))}
        </ul>
      )}

      {p.watchFor.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-hodl-muted">
            What would change this
          </p>
          <ul className="mt-2 space-y-1.5">
            {p.watchFor.map((w) => (
              <li key={w} className="text-xs text-hodl-muted">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
