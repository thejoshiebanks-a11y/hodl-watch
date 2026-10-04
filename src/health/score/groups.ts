import type { HealthFactor, HealthGroup } from "@/health/factors/types";
import { HEALTH_GROUP_WEIGHTS } from "./config";

export type { HealthGroup };

export type HealthGroupSummary = {
  group: HealthGroup;
  score: number | null;
  availableFactors: number;
  totalFactors: number;
};

export function summarizeHealthGroups(
  factors: HealthFactor[],
): HealthGroupSummary[] {
  const groups = Object.keys(HEALTH_GROUP_WEIGHTS) as HealthGroup[];

  return groups.map((group) => {
    const groupFactors = factors.filter((f) => f.group === group);
    const available = groupFactors.filter(
      (f) =>
        f.status === "AVAILABLE" &&
        f.value !== null &&
        Number.isFinite(f.value),
    );
    const score =
      available.length > 0
        ? available.reduce((s, f) => s + (f.value ?? 0), 0) /
          available.length
        : null;

    return {
      group,
      score: score === null ? null : Number(score.toFixed(2)),
      availableFactors: available.length,
      totalFactors: groupFactors.length,
    };
  });
}
