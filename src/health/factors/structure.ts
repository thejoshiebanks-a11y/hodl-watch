import type { AuthorityStatus } from "@/lib/types/identity";

export type NormalizedFactor = {
  score: number;
  explanation: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function scoreAuthority(
  status: AuthorityStatus,
): NormalizedFactor | null {
  if (status === "UNKNOWN") {
    return null;
  }

  const score = status === "REVOKED" ? 10 : 0;

  return {
    score,
    explanation:
      status === "REVOKED"
        ? "Authority is revoked."
        : "Authority remains set.",
  };
}

export function scoreTopHolderConcentration(
  topHolderPct: number | null,
): NormalizedFactor | null {
  if (
    topHolderPct === null ||
    !Number.isFinite(topHolderPct)
  ) {
    return null;
  }

  const score = clamp(
    ((50 - topHolderPct) / 40) * 10,
    0,
    10,
  );

  return {
    score: Number(score.toFixed(2)),
    explanation:
      `Top-holder concentration is ${topHolderPct.toFixed(2)}%, ` +
      `producing a ${score.toFixed(2)} structure contribution.`,
  };
}

export function scoreAuthorityPair(
  mintAuthority: AuthorityStatus,
  freezeAuthority: AuthorityStatus,
): NormalizedFactor | null {
  const scores = [
    scoreAuthority(mintAuthority),
    scoreAuthority(freezeAuthority),
  ].filter(
    (factor): factor is NormalizedFactor => factor !== null,
  );

  if (scores.length === 0) {
    return null;
  }

  const score =
    scores.reduce((sum, factor) => sum + factor.score, 0) /
    scores.length;

  return {
    score: Number(score.toFixed(2)),
    explanation:
      `Authority structure averages ${score.toFixed(2)}/10 ` +
      `across ${scores.length} available authority observations.`,
  };
}
