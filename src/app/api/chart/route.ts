import { NextResponse } from "next/server";
import type { Candle } from "@/lib/types/chart";

const POOL_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const FRESH_MS = 10_000;
const STALE_MS = 10 * 60_000;

const TIMEFRAMES = {
  "1m": { unit: "minute", aggregate: 1 },
  "5m": { unit: "minute", aggregate: 5 },
  "15m": { unit: "minute", aggregate: 15 },
  "1h": { unit: "hour", aggregate: 1 },
  "4h": { unit: "hour", aggregate: 4 },
  all: { unit: "day", aggregate: 1 },
} as const;

type Timeframe = keyof typeof TIMEFRAMES;
type Body = { candles: Candle[]; provider: string; timeframe: string; observedAt: string };

const cache = new Map<string, { at: number; body: Body }>();

function isTimeframe(v: string): v is Timeframe {
  return Object.hasOwn(TIMEFRAMES, v);
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

  const key = `${pool}:${timeframe}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < FRESH_MS) {
    return NextResponse.json(hit.body);
  }

  const fallback = (reason: string) =>
    hit && Date.now() - hit.at < STALE_MS
      ? NextResponse.json({ ...hit.body, stale: true })
      : NextResponse.json({ error: reason }, { status: 502 });

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

    if (!response.ok) return fallback(`upstream_${response.status}`);

    const list = (await response.json())?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list)) return fallback("bad_shape");

    const byTime = new Map<number, Candle>();
    for (const row of list) {
      if (!Array.isArray(row) || row.length < 6) continue;
      const [time, open, high, low, close, volume] = row.map(Number);
      if (![time, open, high, low, close, volume].every(Number.isFinite)) continue;
      byTime.set(time, { time, open, high, low, close, volume });
    }

    const body: Body = {
      candles: [...byTime.values()].sort((a, b) => a.time - b.time),
      provider: "geckoterminal",
      timeframe,
      observedAt: new Date().toISOString(),
    };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch {
    return fallback("upstream_unreachable");
  }
}
