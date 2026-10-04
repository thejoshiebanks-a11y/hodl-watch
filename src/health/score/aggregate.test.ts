import { describe, expect, it } from "vitest";
import type { HealthFactor, HealthGroup } from "@/health/factors/types";
import { aggregateHealth } from "./aggregate";

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

describe("aggregateHealth", () => {
  it("returns unavailable when no factors are available", () => {
    const r = aggregateHealth([factor("a", "MARKET", null)]);
    expect(r.score).toBeNull();
    expect(r.coverage).toBe(0);
  });

  it("renormalizes weights when groups are unavailable", () => {
    // MARKET 0.15 and LIQUIDITY 0.25 observed: (8*.15 + 6*.25) / .40
    const r = aggregateHealth([
      factor("m", "MARKET", 8),
      factor("l", "LIQUIDITY", 6),
      factor("s", "SECURITY", null),
    ]);
    expect(r.score).toBeCloseTo(6.75, 2);
    expect(r.coverage).toBeCloseTo(0.67, 2);
  });

  it("averages multiple factors inside a group", () => {
    const r = aggregateHealth([
      factor("m1", "MARKET", 8),
      factor("m2", "MARKET", 6),
    ]);
    expect(r.score).toBe(7);
  });

  it("does not let unavailable factors contribute zero", () => {
    const r = aggregateHealth([
      factor("m1", "MARKET", 8),
      factor("m2", "MARKET", null),
    ]);
    expect(r.score).toBe(8);
    expect(r.availableFactors).toBe(1);
    expect(r.scoredFactors).toBe(2);
    expect(r.coverage).toBe(0.5);
  });

  it("flags partial when under 60% of checks are observed", () => {
    const partial = aggregateHealth([
      factor("a", "MARKET", 8),
      factor("b", "LIQUIDITY", null),
      factor("c", "SECURITY", null),
    ]);
    expect(partial.partial).toBe(true);

    const full = aggregateHealth([
      factor("a", "MARKET", 8),
      factor("b", "LIQUIDITY", 7),
      factor("c", "SECURITY", 9),
    ]);
    expect(full.partial).toBe(false);
  });

  it("flags missingCritical when Liquidity or Security is unobserved", () => {
    expect(
      aggregateHealth([factor("a", "MARKET", 9)]).missingCritical,
    ).toBe(true);
    expect(
      aggregateHealth([
        factor("a", "LIQUIDITY", 9),
        factor("b", "SECURITY", 9),
      ]).missingCritical,
    ).toBe(false);
  });

  it("keeps the result between 0 and 10", () => {
    const r = aggregateHealth([factor("a", "MARKET", 10)]);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(10);
  });

  it("is deterministic", () => {
    const input = [factor("a", "MARKET", 7.25), factor("b", "FLOW", 5)];
    expect(aggregateHealth(input)).toEqual(aggregateHealth(input));
  });
});
