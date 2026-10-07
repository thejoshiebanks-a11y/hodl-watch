import type { TrendResult } from "@/lib/watch/trend";
import type { HealthFactor } from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** 6 when flat, 10 at +10% or more, 0 at -20% or worse. */
export function scoreHolderTrend(pct: number): number {
  return Number(clamp(pct >= 0 ? 6 + pct * 0.4 : 6 + pct * 0.3, 0, 10).toFixed(2));
}

export function holderTrendFactor(t: TrendResult): HealthFactor {
  const hours = t.hours < 10 ? t.hours.toFixed(1) : String(Math.round(t.hours));
  return {
    key: "holders_trend",
    label: "Holder count trend",
    group: "HOLDERS",
    status: "AVAILABLE",
    value: scoreHolderTrend(t.pct),
    unit: "score",
    explanation: `Holder count ${t.pct >= 0 ? "+" : ""}${t.pct.toFixed(1)}% over ${hours}h.`,
  };
}
