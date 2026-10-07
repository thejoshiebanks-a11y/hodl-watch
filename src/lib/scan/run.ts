import { getDexScreenerSnapshot } from "@/lib/providers/market/dexscreener";
import { getRugcheckIdentity } from "@/lib/providers/risk/rugcheck";
import { POOL_PATTERN, getCandles } from "@/lib/providers/market/candles";
import { calculateHealth } from "@/health/score/calculate";
import { getPeak } from "@/lib/watch/peaks";
import type { Candle } from "@/lib/types/chart";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { ScanSuccess } from "@/lib/types/scan";
import type { TokenMarketSnapshot } from "@/lib/types/token";

export type ScanOutcome =
  | { ok: true; data: ScanSuccess["data"] }
  | { ok: false; code: "TOKEN_NOT_FOUND" };

// Pump.fun tokens trade on a bonding curve, not a pool. DexScreener reports no
// liquidity for them, but RugCheck's market total matched GeckoTerminal's
// reserves on the two tokens we could compare. Provisional until calibrated.
function withCurveLiquidity(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
): TokenMarketSnapshot {
  if (market.dexId !== "pumpfun") return market;

  const reserves = identity.totalMarketLiquidityUsd;
  const curveLiquidity =
    typeof reserves === "number" && reserves > 0 ? reserves : null;
  const useCurve = market.liquidityUsd === null && curveLiquidity !== null;

  return {
    ...market,
    bondingCurve: true,
    liquidityUsd: useCurve ? curveLiquidity : market.liquidityUsd,
    liquiditySource: useCurve ? "rugcheck_curve" : "dexscreener",
  };
}

export async function runScan(mint: string): Promise<ScanOutcome> {
  const [dexMarket, identity] = await Promise.all([
    getDexScreenerSnapshot(mint),
    getRugcheckIdentity(mint),
  ]);

  if (!dexMarket) return { ok: false, code: "TOKEN_NOT_FOUND" };

  const market = withCurveLiquidity(dexMarket, identity);

  // Young pools have too few 15-minute candles for the candle checks, so
  // they use 5-minute candles instead.
  const bornMs = market.pairCreatedAt ? Date.parse(market.pairCreatedAt) : NaN;
  const seenParsed = Date.parse(market.observedAt);
  const seenMs = Number.isFinite(seenParsed) ? seenParsed : Date.now();
  const young = Number.isFinite(bornMs) && seenMs - bornMs < 6 * 3600_000;
  const candleMinutes = young ? 5 : 15;
  let candles: Candle[] | null = null;
  if (market.pairAddress && POOL_PATTERN.test(market.pairAddress)) {
    const c = await getCandles(market.pairAddress, young ? "5m" : "15m", {
      limit: 100,
      timeoutMs: 4000,
      freshMs: 30_000,
    });
    candles = c.ok ? c.body.candles : null;
  }

  const peak = await getPeak(mint);
  const health = calculateHealth(market, identity, candles, peak, candleMinutes);

  return {
    ok: true,
    data: {
      market,
      identity,
      health: health.score,
      factors: health.factors,
    },
  };
}
