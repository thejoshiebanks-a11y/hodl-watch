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
  let stability = 10 * Math.exp(-absoluteMove / stabilityScale);
  if (changePct > 0) {
    // Up-moves are normal for memecoins: free band, then a slow fade to 5.
    const free = horizon === "5m" ? 25 : 50;
    const span = horizon === "5m" ? 125 : 250;
    stability = 10 - 5 * Math.min(1, Math.max(0, changePct - free) / span);
  }
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
