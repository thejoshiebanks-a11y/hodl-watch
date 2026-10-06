export type OutcomeLabel = "gone" | "collapsed" | "declined" | "held" | "unknown";

export type CalibOutcome = {
  at: string;
  label: OutcomeLabel;
  priceChangePct: number | null;
  liquidityChangePct: number | null;
};

export type CalibRecord = {
  id: string;
  mint: string;
  symbol: string | null;
  at: string;
  health: number | null;
  partial: boolean;
  coverage: number;
  domains: Record<string, number | null>;
  priceUsd: number | null;
  liquidityUsd: number | null;
  outcome?: CalibOutcome;
};

type Point = { priceUsd: number | null; liquidityUsd: number | null };

function change(from: number | null, to: number | null): number | null {
  if (typeof from !== "number" || typeof to !== "number") return null;
  if (!(from > 0) || !Number.isFinite(to)) return null;
  return ((to - from) / from) * 100;
}

const round1 = (n: number | null) => (n === null ? null : Number(n.toFixed(1)));

export function labelOutcome(
  before: Point,
  after: Point | null,
): Omit<CalibOutcome, "at"> {
  if (!after) {
    return { label: "gone", priceChangePct: null, liquidityChangePct: null };
  }
  const p = change(before.priceUsd, after.priceUsd);
  const l = change(before.liquidityUsd, after.liquidityUsd);

  if (p === null && l === null) {
    return { label: "unknown", priceChangePct: null, liquidityChangePct: null };
  }

  let label: OutcomeLabel = "held";
  if ((p !== null && p <= -70) || (l !== null && l <= -70)) label = "collapsed";
  else if (p !== null && p <= -30) label = "declined";

  return { label, priceChangePct: round1(p), liquidityChangePct: round1(l) };
}

export const BUCKETS = ["0-4", "4-5.5", "5.5-7.5", "7.5+", "partial", "unscored"] as const;

export function bucketOf(
  r: Pick<CalibRecord, "health" | "partial">,
): (typeof BUCKETS)[number] {
  if (r.partial) return "partial";
  if (r.health === null) return "unscored";

  if (r.health < 4) return "0-4";
  if (r.health < 5.5) return "4-5.5";
  if (r.health < 7.5) return "5.5-7.5";
  return "7.5+";
}

export function summarize(records: CalibRecord[]) {
  const resolved = records.filter(
    (r) => r.outcome && r.outcome.label !== "unknown",
  );

  const buckets = BUCKETS.map((bucket) => {
    const rs = resolved.filter((r) => bucketOf(r) === bucket);
    const count = (l: OutcomeLabel) =>
      rs.filter((r) => r.outcome?.label === l).length;
    const gone = count("gone");
    const collapsed = count("collapsed");
    const declined = count("declined");
    const held = count("held");
    return {
      bucket,
      n: rs.length,
      gone,
      collapsed,
      declined,
      held,
      badRatePct: rs.length
        ? Math.round(((gone + collapsed) / rs.length) * 100)
        : null,
    };
  }).filter((b) => b.n > 0);

  return {
    recorded: records.length,
    resolved: resolved.length,
    pending: records.length - resolved.length,
    buckets,
    warning:
      resolved.length < 30
        ? "Fewer than 30 resolved tokens. Treat these numbers as anecdotes, not evidence."
        : null,
  };
}
