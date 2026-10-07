export type HistoryPoint = {
  at: string;
  holders: number | null;
  liquidityUsd: number | null;
  priceUsd: number | null;
};

export type TrendResult = { pct: number; hours: number };

/**
 * Change in one field over up to `windowHours`, using the oldest point that is
 * at least an hour older than the newest. `points` is newest first.
 */
export function trendOver(
  points: HistoryPoint[],
  field: "holders" | "liquidityUsd",
  windowHours: number,
): TrendResult | null {
  const valid = points
    .map((p) => ({ t: Date.parse(p.at), v: p[field] }))
    .filter(
      (p): p is { t: number; v: number } =>
        Number.isFinite(p.t) && typeof p.v === "number" && Number.isFinite(p.v) && p.v > 0,
    );
  if (valid.length < 2) return null;

  const newest = valid[0];
  const candidates = valid.filter((p) => {
    const h = (newest.t - p.t) / 3_600_000;
    return h >= 1 && h <= windowHours;
  });
  if (candidates.length === 0) return null;

  const oldest = candidates.reduce((a, b) => (b.t < a.t ? b : a));
  return {
    pct: Number((((newest.v - oldest.v) / oldest.v) * 100).toFixed(2)),
    hours: Number(((newest.t - oldest.t) / 3_600_000).toFixed(2)),
  };
}
