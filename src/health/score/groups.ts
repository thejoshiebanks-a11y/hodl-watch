import type { HealthFactor } from "@/health/factors/types";

export type HealthGroup = "TAPE" | "LIQUIDITY" | "FLOW" | "STRUCTURE";

export type HealthGroupSummary = {
  group: HealthGroup;
  score: number | null;
  availableFactors: number;
  totalFactors: number;
};

export function summarizeHealthGroups(
  factors: HealthFactor[],
): HealthGroupSummary[] {
  const groups: HealthGroup[] = [
    "TAPE",
    "LIQUIDITY",
    "FLOW",
    "STRUCTURE",
  ];

  return groups.map((group) => {
    const groupFactors = factors.filter(
      (factor) => factor.group === group,
    );

    const available = groupFactors.filter(
      (factor) =>
        factor.status === "AVAILABLE" &&
        factor.value !== null &&
        Number.isFinite(factor.value),
    );

    const score =
      available.length > 0
        ? available.reduce(
            (sum, factor) => sum + (factor.value ?? 0),
            0,
          ) / available.length
        : null;

    return {
      group,
      score: score === null ? null : Number(score.toFixed(2)),
      availableFactors: available.length,
      totalFactors: groupFactors.length,
    };
  });
}
