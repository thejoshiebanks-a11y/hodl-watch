export type NormalizedFactor = {
  score: number;
  explanation: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizePriceChange(
  changePct: number,
  horizon: "5m" | "1h",
): NormalizedFactor {
  const stabilityScale = horizon === "5m" ? 20 : 50;

  // Tape measures stability, not momentum.
  // Movement in either direction reduces the stability contribution.
  const absoluteMove = Math.abs(changePct);
  const stability = 10 * Math.exp(-absoluteMove / stabilityScale);
  const score = clamp(stability, 0, 10);

  const direction =
    changePct > 0
      ? "positive"
      : changePct < 0
        ? "negative"
        : "flat";

  return {
    score: Number(score.toFixed(2)),
    explanation:
      `${horizon} price change is ${changePct.toFixed(2)}%, ` +
      `with ${direction} movement producing a ${score.toFixed(2)} ` +
      `stability contribution.`,
  };
}

export function scoreTape5m(
  changePct: number | null,
): NormalizedFactor | null {
  if (changePct === null || !Number.isFinite(changePct)) {
    return null;
  }

  return normalizePriceChange(changePct, "5m");
}

export function scoreTape1h(
  changePct: number | null,
): NormalizedFactor | null {
  if (changePct === null || !Number.isFinite(changePct)) {
    return null;
  }

  return normalizePriceChange(changePct, "1h");
}
