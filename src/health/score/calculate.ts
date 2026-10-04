import type { Candle } from "@/lib/types/chart";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { assembleHealthFactors } from "../factors/assemble";
import { aggregateHealth } from "./aggregate";
import type { HealthScore } from "./types";

export function calculateHealth(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
  candles?: Candle[] | null,
): {
  score: HealthScore;
  factors: ReturnType<typeof assembleHealthFactors>;
} {
  const factors = assembleHealthFactors(market, identity, candles);
  const score = aggregateHealth(factors);

  return {
    score,
    factors,
  };
}
