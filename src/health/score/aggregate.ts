import type { HealthFactor } from "@/health/factors/types";
import { HEALTH_GROUP_WEIGHTS, HEALTH_VERSION } from "./config";
import type { HealthScore } from "./types";

type GroupScore = {
  group: keyof typeof HEALTH_GROUP_WEIGHTS;
  score: number;
  weight: number;
  coverage: number;
  availableFactors: number;
  totalFactors: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateGroupScore(
  group: keyof typeof HEALTH_GROUP_WEIGHTS,
  factors: HealthFactor[],
): GroupScore | null {
  const groupFactors = factors.filter((factor) => factor.group === group);
  const available = groupFactors.filter(
    (factor) =>
      factor.status === "AVAILABLE" &&
      factor.value !== null &&
      Number.isFinite(factor.value),
  );

  if (available.length === 0) {
    return null;
  }

  const score =
    available.reduce((sum, factor) => sum + (factor.value ?? 0), 0) /
    available.length;

  return {
    group,
    score: clamp(score, 0, 10),
    weight: HEALTH_GROUP_WEIGHTS[group],
    coverage: available.length / groupFactors.length,
    availableFactors: available.length,
    totalFactors: groupFactors.length,
  };
}

export function aggregateHealth(
  factors: HealthFactor[],
): HealthScore {
  const groups = (
    Object.keys(HEALTH_GROUP_WEIGHTS) as Array<
      keyof typeof HEALTH_GROUP_WEIGHTS
    >
  )
    .map((group) => calculateGroupScore(group, factors))
    .filter((group): group is GroupScore => group !== null);

  if (groups.length === 0) {
    return {
      score: null,
      coverage: 0,
      version: HEALTH_VERSION,
      scoredFactors: 0,
      availableFactors: 0,
      explanation: "Health is unavailable because no scored factors are available.",
    };
  }

  const totalActiveWeight = groups.reduce(
    (sum, group) => sum + group.weight,
    0,
  );

  const weightedScore = groups.reduce(
    (sum, group) => sum + group.score * group.weight,
    0,
  );

  const score = weightedScore / totalActiveWeight;

  const totalScoredFactors = factors.length;

  const totalAvailableFactors = factors.filter(
    (factor) =>
      factor.status === "AVAILABLE" &&
      factor.value !== null &&
      Number.isFinite(factor.value),
  ).length;

  const coverage =
    totalScoredFactors > 0
      ? totalAvailableFactors / totalScoredFactors
      : 0;

  const explanation = groups
    .map(
      (group) =>
        `${group.group} ${group.score.toFixed(2)}/10 ` +
        `(${group.availableFactors}/${group.totalFactors} factors available)`,
    )
    .join("; ");

  return {
    score: Number(clamp(score, 0, 10).toFixed(2)),
    coverage: Number(coverage.toFixed(2)),
    version: HEALTH_VERSION,
    scoredFactors: totalScoredFactors,
    availableFactors: totalAvailableFactors,
    explanation,
  };
}
