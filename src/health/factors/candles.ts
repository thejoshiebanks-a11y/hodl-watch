import type { Candle } from "@/lib/types/chart";
import type { NormalizedFactor } from "./tape";

// Provisional thresholds for Health v0.1.2.
const WINDOW_SECONDS = 24 * 3600;
const MIN_CANDLES = 12;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const out = (score: number, explanation: string): NormalizedFactor => ({
  score: Number(clamp(score, 0, 10).toFixed(2)),
  explanation,
});

function windowed(candles: Candle[] | null): Candle[] | null {
  if (!candles || candles.length === 0) return null;
  const last = candles[candles.length - 1].time;
  const w = candles.filter((c) => c.time >= last - WINDOW_SECONDS);
  return w.length >= MIN_CANDLES ? w : null;
}

export function scoreDrawdown(candles: Candle[] | null): NormalizedFactor | null {
  const w = windowed(candles);
  if (!w) return null;
  const peak = Math.max(...w.map((c) => c.high));
  const last = w[w.length - 1].close;
  if (!(peak > 0) || !Number.isFinite(last)) return null;
  const dd = Math.max(0, ((peak - last) / peak) * 100);
  return out(
    10 * Math.exp(-dd / 40),
    `Price is ${dd.toFixed(1)}% below its 24h high.`,
  );
}

export function scoreVolatility(
  candles: Candle[] | null,
  intervalMinutes = 15,
): NormalizedFactor | null {
  const w = windowed(candles);
  if (!w) return null;
  const rets: number[] = [];
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1].close;
    const b = w[i].close;
    if (a > 0 && b > 0) rets.push(Math.log(b / a));
  }
  if (rets.length < MIN_CANDLES - 1) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  // Moves grow with the square root of time, so scale to a 15-minute
  // equivalent. That keeps scores comparable across candle sizes.
  const step = intervalMinutes > 0 ? intervalMinutes : 15;
  const sigma = Math.sqrt(variance) * 100 * Math.sqrt(15 / step);
  return out(
    10 * Math.exp(-sigma / 4),
    `Typical move per 15 minutes is about ${sigma.toFixed(2)}%${step === 15 ? "" : ` (scaled from ${step}m candles)`} over the last 24h.`,
  );
}

export function scoreRecovery(candles: Candle[] | null): NormalizedFactor | null {
  const w = windowed(candles);
  if (!w) return null;

  let lowIdx = 0;
  for (let i = 1; i < w.length; i++) {
    if (w[i].low < w[lowIdx].low) lowIdx = i;
  }
  const low = w[lowIdx].low;
  const peak = Math.max(...w.slice(0, lowIdx + 1).map((c) => c.high));
  const last = w[w.length - 1].close;
  if (!(peak > 0) || !(low > 0) || !Number.isFinite(last)) return null;

  const drop = ((peak - low) / peak) * 100;
  if (drop < 10) {
    return out(
      9,
      `No meaningful drawdown in the last 24h (largest drop ${drop.toFixed(1)}%), so there is nothing to recover from.`,
    );
  }

  const recovered = clamp((last - low) / (peak - low), 0, 1);
  return out(
    3 + 7 * recovered,
    `After a ${drop.toFixed(1)}% drop, price has recovered ${(recovered * 100).toFixed(0)}% of it.`,
  );
}
