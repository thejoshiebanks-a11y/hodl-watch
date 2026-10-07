import type { Candle } from "@/lib/types/chart";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { assembleHealthFactors } from "../factors/assemble";
import { aggregateHealth } from "./aggregate";
import { computeCaps, type PeakInfo } from "./caps";
import { applyCurveRules } from "./curve";
import type { HealthScore } from "./types";

export function calculateHealth(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
  candles?: Candle[] | null,
  peak?: PeakInfo | null,
  candleMinutes = 15,
): {
  score: HealthScore;
  factors: ReturnType<typeof assembleHealthFactors>;
} {
  const factors = assembleHealthFactors(market, identity, candles, candleMinutes);
  const base = aggregateHealth(factors);

  const caps = applyCurveRules(
    computeCaps(market, identity, peak ?? null),
    market.bondingCurve === true,
  );
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
        ? caps[0].key === "pool_new" || caps[0].key === "pool_young"
          ? `Early-token ceiling of ${caps[0].max.toFixed(1)}: ${caps[0].reason} The underlying score is ${base.score.toFixed(1)}, and the ceiling lifts as the pool ages. ${base.explanation}`
          : `Capped at ${caps[0].max.toFixed(1)}: ${caps[0].reason} ${base.explanation}`
        : base.explanation,
    },
    factors,
  };
}
