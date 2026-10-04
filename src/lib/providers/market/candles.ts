import type { Candle } from "@/lib/types/chart";

export const POOL_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const TIMEFRAMES = {
  "1m": { unit: "minute", aggregate: 1 },
  "5m": { unit: "minute", aggregate: 5 },
  "15m": { unit: "minute", aggregate: 15 },
  "1h": { unit: "hour", aggregate: 1 },
  "4h": { unit: "hour", aggregate: 4 },
  all: { unit: "day", aggregate: 1 },
} as const;

export type Timeframe = keyof typeof TIMEFRAMES;

export function isTimeframe(v: string): v is Timeframe {
  return Object.hasOwn(TIMEFRAMES, v);
}

export type CandleBody = {
  candles: Candle[];
  provider: string;
  timeframe: string;
  observedAt: string;
};

export type CandleResult =
  | { ok: true; body: CandleBody; stale: boolean }
  | { ok: false; reason: string };

const STALE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; body: CandleBody }>();

export async function getCandles(
  pool: string,
  timeframe: Timeframe,
  opts: { limit?: number; timeoutMs?: number; freshMs?: number } = {},
): Promise<CandleResult> {
  const limit = opts.limit ?? 200;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const freshMs = opts.freshMs ?? 10_000;

  const key = `${pool}:${timeframe}:${limit}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < freshMs) {
    return { ok: true, body: hit.body, stale: false };
  }

  const fail = (reason: string): CandleResult =>
    hit && Date.now() - hit.at < STALE_MS
      ? { ok: true, body: hit.body, stale: true }
      : { ok: false, reason };

  const { unit, aggregate } = TIMEFRAMES[timeframe];
  const url =
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}` +
    `/ohlcv/${unit}?aggregate=${aggregate}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return fail(`upstream_${response.status}`);

    const list = (await response.json())?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list)) return fail("bad_shape");

    const byTime = new Map<number, Candle>();
    for (const row of list) {
      if (!Array.isArray(row) || row.length < 6) continue;
      const [time, open, high, low, close, volume] = row.map(Number);
      if (![time, open, high, low, close, volume].every(Number.isFinite)) continue;
      byTime.set(time, { time, open, high, low, close, volume });
    }

    const body: CandleBody = {
      candles: [...byTime.values()].sort((a, b) => a.time - b.time),
      provider: "geckoterminal",
      timeframe,
      observedAt: new Date().toISOString(),
    };
    cache.set(key, { at: Date.now(), body });
    return { ok: true, body, stale: false };
  } catch {
    return fail("upstream_unreachable");
  }
}
