import { NextResponse } from "next/server";
import { getDexScreenerSnapshot } from "@/lib/providers/market/dexscreener";
import { getRugcheckIdentity } from "@/lib/providers/risk/rugcheck";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { calculateHealth } from "@/health/score/calculate";

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

    const health = calculateHealth(market, identity);

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
