import type { NormalizedFactor } from "./tape";

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const positive = (n: number | null): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

// 10 at or below `clean`, 0 at or above `bad`, log-scaled in between.
function logScale(x: number, clean: number, bad: number): number {
  if (x <= clean) return 10;
  if (x >= bad) return 0;
  return clamp(
    10 * (1 - (Math.log10(x) - Math.log10(clean)) / (Math.log10(bad) - Math.log10(clean))),
    0,
    10,
  );
}

// Provisional scales. Real wash detection needs wallet-level trades, so these
// only flag the patterns that usually go with it.
export function scoreVolumeToMarketCap(
  volumeUsd: number | null,
  marketCapUsd: number | null,
): NormalizedFactor | null {
  if (!positive(volumeUsd) || !positive(marketCapUsd)) return null;
  const ratio = volumeUsd / marketCapUsd;
  return {
    score: Number(logScale(ratio, 5, 60).toFixed(2)),
    explanation:
      `24h volume is ${ratio.toFixed(1)}x market cap. ` +
      (ratio > 5
        ? "Volume this large for the size can mean churn or wash trading."
        : "That is normal for the size."),
  };
}

export function scoreTradesPerHolder(
  buys: number | null,
  sells: number | null,
  holders: number | null,
): NormalizedFactor | null {
  if (typeof buys !== "number" || typeof sells !== "number") return null;
  if (!Number.isFinite(buys) || !Number.isFinite(sells) || !positive(holders)) return null;
  const trades = buys + sells;
  if (trades < 100) return null;
  const ratio = trades / holders;
  return {
    score: Number(logScale(ratio, 10, 100).toFixed(2)),
    explanation:
      `${trades.toLocaleString("en-US")} trades from ${holders.toLocaleString("en-US")} holders is ${ratio.toFixed(1)} trades per holder.` +
      (ratio > 10 ? " A few wallets may be trading back and forth." : ""),
  };
}
