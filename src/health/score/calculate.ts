import type { Candle } from "@/lib/types/chart";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { assembleHealthFactors } from "../factors/assemble";
import { aggregateHealth } from "./aggregate";
import { computeCaps, type PeakInfo } from "./caps";
import type { HealthScore } from "./types";

export function calculateHealth(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
  candles?: Candle[] | null,
  peak?: PeakInfo | null,
): {
  score: HealthScore;
  factors: ReturnType<typeof assembleHealthFactors>;
} {
  const factors = assembleHealthFactors(market, identity, candles);
  const base = aggregateHealth(factors);

  const caps = computeCaps(market, identity, peak ?? null);
  // Unknowns count against a token instead of quietly dropping out.
  if (base.missingCritical) {
    caps.push({
      key: "missing_critical",
      max: 5,
      reason: "Security or liquidity could not be checked.",
    });
  } else if (base.partial) {
    caps.push({
      key: "partial",
      max: 6,
      reason: "Fewer than 60% of checks could be observed.",
    });
  }
  caps.sort((a, b) => a.max - b.max);

  if (base.score === null || caps.length === 0) {
    return { score: { ...base, uncappedScore: base.score, caps: [] }, factors };
  }

  const capped = Number(Math.min(base.score, caps[0].max).toFixed(2));
  const binding = capped < base.score;

  return {
    score: {
      ...base,
      score: capped,
      uncappedScore: base.score,
      caps,
      explanation: binding
        ? `Capped at ${caps[0].max.toFixed(1)}: ${caps[0].reason} ${base.explanation}`
        : base.explanation,
    },
    factors,
  };
}
