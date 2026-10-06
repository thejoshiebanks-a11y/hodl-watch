import { describe, expect, it } from "vitest";
import { ALERT_CATALOG, sanitizeRules, shouldAlert } from "./alert-catalog";

describe("shouldAlert", () => {
  it("uses the default threshold when the user set nothing", () => {
    expect(shouldAlert("LIQUIDITY_DROP", 14, undefined)).toBe(false);
    expect(shouldAlert("LIQUIDITY_DROP", 16, undefined)).toBe(true);
  });

  it("respects a custom threshold and an off switch", () => {
    expect(shouldAlert("LIQUIDITY_DROP", 8, { LIQUIDITY_DROP: { min: 5 } })).toBe(true);
    expect(shouldAlert("LIQUIDITY_DROP", 50, { LIQUIDITY_DROP: { on: false } })).toBe(false);
  });

  it("lets users turn on alerts that are off by default", () => {
    expect(shouldAlert("PRICE_SPIKE", 30, undefined)).toBe(false);
    expect(shouldAlert("PRICE_SPIKE", 30, { PRICE_SPIKE: { on: true } })).toBe(true);
  });

  it("ignores unknown kinds", () => {
    expect(shouldAlert("NOPE", 1, undefined)).toBe(false);
  });
});

describe("sanitizeRules", () => {
  it("drops junk and clamps out-of-range values", () => {
    const out = sanitizeRules({
      LIQUIDITY_DROP: { on: true, min: 9999 },
      NOPE: { on: true },
      RUGGED: { min: 5, on: "yes" },
    });
    expect(out).toEqual({ LIQUIDITY_DROP: { on: true, min: 90 } });
  });
});

describe("catalog", () => {
  it("has unique kinds", () => {
    const kinds = ALERT_CATALOG.map((d) => d.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});
