import { describe, expect, it } from "vitest";
import type { HealthFactor, HealthGroup } from "@/health/factors/types";
import { summarizeHealthGroups } from "./groups";

function factor(
  key: string,
  group: HealthGroup,
  value: number | null,
): HealthFactor {
  return {
    key,
    label: key,
    group,
    status: value === null ? "N/A" : "AVAILABLE",
    value,
    unit: value === null ? null : "score",
    explanation: "test",
  };
}

describe("summarizeHealthGroups", () => {
  it("summarizes available factors and preserves missing data", () => {
    const result = summarizeHealthGroups([
      factor("m1", "MARKET", 8),
      factor("m2", "MARKET", 10),
      factor("l1", "LIQUIDITY", 10),
      factor("f1", "FLOW", null),
      factor("s1", "SECURITY", 10),
      factor("s2", "SECURITY", null),
    ]);

    const get = (g: HealthGroup) => result.find((r) => r.group === g)!;

    expect(get("MARKET")).toMatchObject({
      score: 9,
      availableFactors: 2,
      totalFactors: 2,
    });
    expect(get("LIQUIDITY").score).toBe(10);
    expect(get("FLOW")).toMatchObject({
      score: null,
      availableFactors: 0,
      totalFactors: 1,
    });
    expect(get("SECURITY")).toMatchObject({
      score: 10,
      availableFactors: 1,
      totalFactors: 2,
    });
    expect(result).toHaveLength(7);
  });
});
