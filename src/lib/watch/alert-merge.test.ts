import { describe, expect, it } from "vitest";
import { mergeRules, type AlertRules } from "./alert-catalog";

const global: AlertRules = {
  LIQUIDITY_DROP: { on: true, min: 20 },
  PRICE_DROP: { min: 12 },
};

describe("mergeRules", () => {
  it("lets a token override one field and keeps the rest", () => {
    const m = mergeRules(global, { LIQUIDITY_DROP: { min: 5 } });
    expect(m.LIQUIDITY_DROP).toEqual({ on: true, min: 5 });
    expect(m.PRICE_DROP).toEqual({ min: 12 });
  });

  it("can switch an alert off or on for one token", () => {
    const m = mergeRules(global, { PRICE_DROP: { on: false }, PRICE_SPIKE: { on: true } });
    expect(m.PRICE_DROP).toEqual({ min: 12, on: false });
    expect(m.PRICE_SPIKE).toEqual({ on: true });
  });

  it("does not change the global rules", () => {
    mergeRules(global, { LIQUIDITY_DROP: { min: 5 } });
    expect(global.LIQUIDITY_DROP).toEqual({ on: true, min: 20 });
  });

  it("returns the global rules when there is no override", () => {
    expect(mergeRules(global, {})).toEqual(global);
  });
});
