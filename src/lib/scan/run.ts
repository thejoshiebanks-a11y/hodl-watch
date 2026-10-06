import { getDexScreenerSnapshot } from "@/lib/providers/market/dexscreener";
import { getRugcheckIdentity } from "@/lib/providers/risk/rugcheck";
import { POOL_PATTERN, getCandles } from "@/lib/providers/market/candles";
import { calculateHealth } from "@/health/score/calculate";
import { getPeak } from "@/lib/watch/peaks";
import type { Candle } from "@/lib/types/chart";
import type { ScanSuccess } from "@/lib/types/scan";

export type ScanOutcome =
  | { ok: true; data: ScanSuccess["data"] }
  | { ok: false; code: "TOKEN_NOT_FOUND" };

export async function runScan(mint: string): Promise<ScanOutcome> {
  const [market, identity] = await Promise.all([
    getDexScreenerSnapshot(mint),
    getRugcheckIdentity(mint),
  ]);

  if (!market) return { ok: false, code: "TOKEN_NOT_FOUND" };

  let candles: Candle[] | null = null;
  if (market.pairAddress && POOL_PATTERN.test(market.pairAddress)) {
    const c = await getCandles(market.pairAddress, "15m", {
      limit: 100,
      timeoutMs: 4000,
      freshMs: 30_000,
    });
    candles = c.ok ? c.body.candles : null;
  }

  const peak = await getPeak(mint);
  const health = calculateHealth(market, identity, candles, peak);

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
