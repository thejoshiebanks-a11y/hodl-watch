import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  POOL_PATTERN,
  getCandles,
  isTimeframe,
} from "@/lib/providers/market/candles";

export async function GET(request: Request) {
  const limit = await rateLimit(request, "chart", 120, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const pool = searchParams.get("pool") ?? "";
  const timeframe = searchParams.get("timeframe") ?? "5m";

  if (!POOL_PATTERN.test(pool)) {
    return NextResponse.json({ error: "invalid_pool" }, { status: 400 });
  }
  if (!isTimeframe(timeframe)) {
    return NextResponse.json({ error: "invalid_timeframe" }, { status: 400 });
  }

  const result = await getCandles(pool, timeframe);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }

  return NextResponse.json(
    result.stale ? { ...result.body, stale: true } : result.body,
  );
}
