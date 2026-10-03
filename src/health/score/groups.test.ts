import { describe, expect, it } from "vitest";
import { summarizeHealthGroups } from "./groups";
import type { HealthFactor } from "@/health/factors/types";

const factors: HealthFactor[] = [
  {
    key: "tape_5m",
    label: "5m price stability",
    group: "TAPE",
    status: "AVAILABLE",
    value: 8,
    unit: "score",
    explanation: "test",
  },
  {
    key: "tape_1h",
    label: "1h price stability",
    group: "TAPE",
    status: "AVAILABLE",
    value: 10,
    unit: "score",
    explanation: "test",
  },
  {
    key: "liquidity_usd",
    label: "Absolute liquidity",
    group: "LIQUIDITY",
    status: "AVAILABLE",
    value: 10,
    unit: "score",
    explanation: "test",
  },
  {
    key: "liquidity_ratio",
    label: "Liquidity / market cap",
    group: "LIQUIDITY",
    status: "N/A",
    value: null,
    unit: null,
    explanation: "test",
  },
  {
    key: "flow",
    label: "Flow",
    group: "FLOW",
    status: "N/A",
    value: null,
    unit: null,
    explanation: "test",
  },
  {
    key: "structure_authorities",
    label: "Mint / freeze authority",
    group: "STRUCTURE",
    status: "AVAILABLE",
    value: 10,
    unit: "score",
    explanation: "test",
  },
  {
    key: "structure_top_holder",
    label: "Top-holder concentration",
    group: "STRUCTURE",
    status: "N/A",
    value: null,
    unit: null,
    explanation: "test",
  },
];

describe("summarizeHealthGroups", () => {
  it("summarizes available factors and preserves missing data", () => {
    const result = summarizeHealthGroups(factors);

    expect(result).toEqual([
      {
        group: "TAPE",
        score: 9,
        availableFactors: 2,
        totalFactors: 2,
      },
      {
        group: "LIQUIDITY",
        score: 10,
        availableFactors: 1,
        totalFactors: 2,
      },
      {
        group: "FLOW",
        score: null,
        availableFactors: 0,
        totalFactors: 1,
      },
      {
        group: "STRUCTURE",
        score: 10,
        availableFactors: 1,
        totalFactors: 2,
      },
    ]);
  });
});
