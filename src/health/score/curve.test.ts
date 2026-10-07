import { describe, expect, it } from "vitest";
import { applyCurveRules } from "./curve";

const cap = (key: string, max: number) => ({ key, max, reason: key });

describe("applyCurveRules", () => {
  it("leaves caps alone off the curve", () => {
    const caps = [cap("liquidity_unknown", 3)];
    expect(applyCurveRules(caps, false)).toEqual(caps);
  });

  it("drops drained-pool caps on the curve and adds the curve ceiling", () => {
    const out = applyCurveRules(
      [cap("liquidity_unknown", 3), cap("liquidity_tiny", 3), cap("fresh_launch", 5)],
      true,
    );
    expect(out.map((c) => c.key)).toEqual(["bonding_curve"]);
    expect(out[0].max).toBe(7);
  });

  it("keeps real red flags on the curve", () => {
    const keys = applyCurveRules(
      [cap("mint_authority", 3), cap("insiders_high", 5), cap("liquidity_thin", 5.5)],
      true,
    ).map((c) => c.key);
    expect(keys).toContain("mint_authority");
    expect(keys).toContain("insiders_high");
    expect(keys).not.toContain("liquidity_thin");
  });
});
