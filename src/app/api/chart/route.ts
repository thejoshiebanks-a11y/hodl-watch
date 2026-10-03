import { NextResponse } from "next/server";
import type { Candle } from "@/lib/types/chart";

const POOL_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const TIMEFRAMES = {
  "1m": { unit: "minute", aggregate: 1 },
  "5m": { unit: "minute", aggregate: 5 },
  "15m": { unit: "minute", aggregate: 15 },
  "1h": { unit: "hour", aggregate: 1 },
  "4h": { unit: "hour", aggregate: 4 },
} as const;

type Timeframe = keyof typeof TIMEFRAMES;

function isTimeframe(value: string): value is Timeframe {
  return Object.hasOwn(TIMEFRAMES, value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pool = searchParams.get("pool") ?? "";
  const timeframe = searchParams.get("timeframe") ?? "5m";

  if (!POOL_PATTERN.test(pool)) {
    return NextResponse.json({ error: "invalid_pool" }, { status: 400 });
  }

  if (!isTimeframe(timeframe)) {
    return NextResponse.json({ error: "invalid_timeframe" }, { status: 400 });
  }

  const { unit, aggregate } = TIMEFRAMES[timeframe];

  const url =
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}` +
    `/ohlcv/${unit}?aggregate=${aggregate}&limit=200`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "upstream_error", status: response.status },
        { status: 502 },
      );
    }

    const json = await response.json();
    const list = json?.data?.attributes?.ohlcv_list;

    if (!Array.isArray(list)) {
      return NextResponse.json({ error: "bad_shape" }, { status: 502 });
    }

    const byTime = new Map<number, Candle>();

    for (const row of list) {
      if (!Array.isArray(row) || row.length < 6) continue;

      const [time, open, high, low, close, volume] = row.map(Number);

      if (![time, open, high, low, close, volume].every(Number.isFinite)) {
        continue;
      }

      byTime.set(time, { time, open, high, low, close, volume });
    }

    const candles = [...byTime.values()].sort((a, b) => a.time - b.time);

    return NextResponse.json({
      candles,
      provider: "geckoterminal",
      timeframe,
      observedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
