import { NextResponse } from "next/server";
import { getDexScreenerSnapshot } from "@/lib/providers/market/dexscreener";
import { getRugcheckIdentity } from "@/lib/providers/risk/rugcheck";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { calculateHealth } from "@/health/score/calculate";
import { POOL_PATTERN, getCandles } from "@/lib/providers/market/candles";
import type { Candle } from "@/lib/types/chart";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = SolanaMintSchema.safeParse(body?.mint);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid Solana mint address",
          code: "INVALID_MINT",
        },
        { status: 400 },
      );
    }

    const mint = result.data;

    const [market, identity] = await Promise.all([
      getDexScreenerSnapshot(mint),
      getRugcheckIdentity(mint),
    ]);

    if (!market) {
      return NextResponse.json(
        {
          error: "No Solana market pair found for this mint",
          code: "TOKEN_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    let candles: Candle[] | null = null;
    if (market.pairAddress && POOL_PATTERN.test(market.pairAddress)) {
      const c = await getCandles(market.pairAddress, "15m", {
        limit: 100,
        timeoutMs: 4000,
        freshMs: 30_000,
      });
      candles = c.ok ? c.body.candles : null;
    }

    const health = calculateHealth(market, identity, candles);

    return NextResponse.json({
      data: {
        market,
        identity,
        health: health.score,
        factors: health.factors,
      },
    });
  } catch (error) {
    console.error("Scan failed:", error);

    return NextResponse.json(
      {
        error: "Unable to complete scan",
        code: "SCAN_FAILED",
      },
      { status: 502 },
    );
  }
}
