import { describe, expect, it } from "vitest";
import { holderTrendFactor } from "../factors/trend";
import type { HealthFactor } from "../factors/types";
import { buildPanel } from "./panel";

const market1h = {
  key: "market_1h",
  label: "market_1h",
  group: "MARKET",
  status: "AVAILABLE",
  value: 8,
  unit: "score",
  explanation: "1h note",
} as unknown as HealthFactor;

describe("buildPanel with extra factors", () => {
  it("counts a holder trend in the setup score and the reasons", () => {
    const p = buildPanel({
      factors: [market1h],
      extraFactors: [holderTrendFactor({ pct: -20, hours: 6 })],
      caps: [],
      coverage: 0.9,
      missingCritical: false,
    });
    expect(p.setup).toBe(4);
    expect(p.reasons.some((r) => r.text.includes("Holder count"))).toBe(true);
  });
});
