import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { POOL_PATTERN } from "@/lib/providers/market/candles";
import { readHistory } from "@/lib/watch/history";
import { trendOver } from "@/lib/watch/trend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = await rateLimit(request, "trend", 60, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const mint = new URL(request.url).searchParams.get("mint") ?? "";
  if (!POOL_PATTERN.test(mint)) {
    return NextResponse.json({ error: "invalid_mint" }, { status: 400 });
  }

  try {
    const points = await readHistory(mint);
    return NextResponse.json({
      points: points.length,
      holders: trendOver(points, "holders", 6),
      liquidity: trendOver(points, "liquidityUsd", 6),
    });
  } catch {
    return NextResponse.json({ points: 0, holders: null, liquidity: null });
  }
}
