export type NormalizedFactor = {
  score: number;
  explanation: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isValidPositiveNumber(value: number | null): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function scoreLiquidityUsd(
  liquidityUsd: number | null,
): NormalizedFactor | null {
  if (!isValidPositiveNumber(liquidityUsd)) {
    return null;
  }

  // Logarithmic scale prevents large absolute values from dominating
  // the factor while preserving meaningful differences at lower levels.
  const score = clamp(
    ((Math.log10(liquidityUsd) - Math.log10(1_000)) /
      (Math.log10(10_000_000) - Math.log10(1_000))) *
      10,
    0,
    10,
  );

  return {
    score: Number(score.toFixed(2)),
    explanation:
      `Liquidity is $${liquidityUsd.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })}, producing a ${score.toFixed(2)} liquidity contribution.`,
  };
}

export function scoreLiquidityRatio(
  liquidityUsd: number | null,
  marketCapUsd: number | null,
): NormalizedFactor | null {
  if (
    !isValidPositiveNumber(liquidityUsd) ||
    !isValidPositiveNumber(marketCapUsd)
  ) {
    return null;
  }

  const ratio = liquidityUsd / marketCapUsd;

  // 1% liquidity/MC is a low reference point.
  // 50% is treated as the upper reference point for this factor.
  const score = clamp(
    ((Math.log10(ratio) - Math.log10(0.01)) /
      (Math.log10(0.5) - Math.log10(0.01))) *
      10,
    0,
    10,
  );

  return {
    score: Number(score.toFixed(2)),
    explanation:
      `Liquidity is ${(ratio * 100).toFixed(2)}% of market cap, ` +
      `producing a ${score.toFixed(2)} liquidity-ratio contribution.`,
  };
}
