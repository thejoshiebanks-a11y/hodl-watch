import { describe, expect, it } from "vitest";
import { showInFeed, wantsPush } from "./alert-filter";
import type { WatchEvent } from "./detect";

const ev = (kind: string, severity: WatchEvent["severity"], value?: number): WatchEvent => ({
  kind,
  severity,
  title: "t",
  detail: "d",
  ...(value === undefined ? {} : { value }),
});

describe("wantsPush", () => {
  const warn = { minSeverity: "warning" as const, rules: {} };

  it("ignores small moves under the default threshold", () => {
    expect(wantsPush(ev("LIQUIDITY_DROP", "warning", 6), warn)).toBe(false);
    expect(wantsPush(ev("LIQUIDITY_DROP", "warning", 20), warn)).toBe(true);
  });

  it("honours a lower custom threshold", () => {
    const s = { ...warn, rules: { LIQUIDITY_DROP: { min: 5 } } };
    expect(wantsPush(ev("LIQUIDITY_DROP", "warning", 6), s)).toBe(true);
  });

  it("does not push info alerts unless switched on", () => {
    expect(wantsPush(ev("PRICE_SPIKE", "info", 50), warn)).toBe(false);
    const s = { ...warn, rules: { PRICE_SPIKE: { on: true } } };
    expect(wantsPush(ev("PRICE_SPIKE", "info", 50), s)).toBe(true);
  });

  it("critical-only mode blocks warnings but not alerts switched on by hand", () => {
    const s = { minSeverity: "critical" as const, rules: {} };
    expect(wantsPush(ev("PRICE_DROP", "warning", 12), s)).toBe(false);
    expect(wantsPush(ev("RUGGED", "critical"), s)).toBe(true);
    const manual = { ...s, rules: { PRICE_DROP: { on: true } } };
    expect(wantsPush(ev("PRICE_DROP", "warning", 12), manual)).toBe(true);
  });
});

describe("showInFeed", () => {
  it("shows info alerts at their default size and hides tiny ones", () => {
    expect(showInFeed(ev("PRICE_SPIKE", "info", 12), {})).toBe(true);
    expect(showInFeed(ev("PRICE_SPIKE", "info", 4), {})).toBe(false);
  });

  it("hides alerts the user switched off", () => {
    expect(showInFeed(ev("RUGGED", "critical"), { RUGGED: { on: false } })).toBe(false);
  });
});
