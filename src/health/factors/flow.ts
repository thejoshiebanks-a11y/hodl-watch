import type { NormalizedFactor } from "./tape";

// Provisional constants for Health v0.1.1.
// Flow is based on transaction counts, not USD buy/sell volume.
const MIN_TRANSACTIONS = 20;
const BALANCED_SCORE = 7;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function scoreFlow(
  buys: number | null,
  sells: number | null,
  horizon: "5m" | "1h" | "6h" | "24h" = "1h",
): NormalizedFactor | null {
  if (
    buys === null ||
    sells === null ||
    !Number.isFinite(buys) ||
    !Number.isFinite(sells) ||
    buys < 0 ||
    sells < 0
  ) {
    return null;
  }

  const total = buys + sells;

  if (total < MIN_TRANSACTIONS) {
    return null;
  }

  const imbalance = (buys - sells) / total;

  const raw =
    imbalance >= 0
      ? BALANCED_SCORE + (10 - BALANCED_SCORE) * imbalance
      : BALANCED_SCORE + BALANCED_SCORE * imbalance;

  const score = clamp(raw, 0, 10);
  const buyShare = ((buys / total) * 100).toFixed(1);

  return {
    score: Number(score.toFixed(2)),
    explanation:
      `${horizon} flow: ${buys} buys vs ${sells} sells ` +
      `(${buyShare}% buys by transaction count), ` +
      `producing a ${score.toFixed(2)} flow contribution.`,
  };
}
