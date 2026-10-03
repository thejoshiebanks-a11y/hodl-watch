import { describe, expect, it } from "vitest";
import { aggregateHealth } from "./aggregate";
import type { HealthFactor } from "@/health/factors/types";

function factor(
  key: string,
  group: HealthFactor["group"],
  value: number | null,
  status: HealthFactor["status"] = value === null
    ? "N/A"
    : "AVAILABLE",
): HealthFactor {
  return {
    key,
    label: key,
    group,
    status,
    value,
    unit: null,
    explanation: "",
  };
}

describe("aggregateHealth", () => {
  it("returns unavailable when no factors are available", () => {
    const result = aggregateHealth([
      factor("flow", "FLOW", null),
      factor("structure", "STRUCTURE", null),
    ]);

    expect(result.score).toBeNull();
    expect(result.coverage).toBe(0);
    expect(result.availableFactors).toBe(0);
  });

  it("renormalizes weights when groups are unavailable", () => {
    const result = aggregateHealth([
      factor("tape", "TAPE", 8),
      factor("liquidity", "LIQUIDITY", 6),
      factor("flow", "FLOW", null),
      factor("structure", "STRUCTURE", null),
    ]);

    expect(result.score).toBe(7);
    expect(result.coverage).toBe(0.5);
  });

  it("averages multiple factors inside a group", () => {
    const result = aggregateHealth([
      factor("tape-5m", "TAPE", 8),
      factor("tape-1h", "TAPE", 6),
      factor("liquidity", "LIQUIDITY", 4),
    ]);

    expect(result.score).toBe(5.5);
  });

  it("does not let unavailable factors contribute zero", () => {
    const result = aggregateHealth([
      factor("tape", "TAPE", 8),
      factor("tape-missing", "TAPE", null),
    ]);

    expect(result.score).toBe(8);
    expect(result.availableFactors).toBe(1);
    expect(result.scoredFactors).toBe(2);
  });

  it("keeps the result between 0 and 10", () => {
    const result = aggregateHealth([
      factor("tape", "TAPE", 10),
      factor("liquidity", "LIQUIDITY", 10),
    ]);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it("is deterministic", () => {
    const factors = [
      factor("tape", "TAPE", 7.25),
      factor("liquidity", "LIQUIDITY", 5.5),
    ];

    expect(aggregateHealth(factors)).toEqual(aggregateHealth(factors));
  });
});
