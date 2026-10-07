import { describe, expect, it } from "vitest";
import { holderTrendFactor, scoreHolderTrend } from "../../health/factors/trend";
import { trendOver, type HistoryPoint } from "./trend";

const pt = (at: string, holders: number | null): HistoryPoint => ({
  at,
  holders,
  liquidityUsd: null,
  priceUsd: null,
});

describe("trendOver", () => {
  const rising = [
    pt("2026-10-07T12:00:00Z", 1100),
    pt("2026-10-07T09:00:00Z", 1050),
    pt("2026-10-07T06:00:00Z", 1000),
    pt("2026-10-07T05:00:00Z", 900),
  ];

  it("uses the oldest point inside the window", () => {
    expect(trendOver(rising, "holders", 6)).toEqual({ pct: 10, hours: 6 });
  });

  it("needs at least an hour of history", () => {
    expect(
      trendOver([pt("2026-10-07T12:00:00Z", 1100), pt("2026-10-07T11:40:00Z", 1000)], "holders", 6),
    ).toBeNull();
    expect(trendOver([pt("2026-10-07T12:00:00Z", 1100)], "holders", 6)).toBeNull();
    expect(trendOver([], "holders", 6)).toBeNull();
  });

  it("reports a fall", () => {
    const t = trendOver([pt("2026-10-07T12:00:00Z", 800), pt("2026-10-07T08:00:00Z", 1000)], "holders", 6);
    expect(t?.pct).toBe(-20);
  });

  it("skips points without a value", () => {
    const t = trendOver(
      [pt("2026-10-07T12:00:00Z", 1100), pt("2026-10-07T10:00:00Z", null), pt("2026-10-07T08:00:00Z", 1000)],
      "holders",
      6,
    );
    expect(t).toEqual({ pct: 10, hours: 4 });
  });
});

describe("holder trend factor", () => {
  it("scores flat, growth and decline", () => {
    expect(scoreHolderTrend(0)).toBe(6);
    expect(scoreHolderTrend(10)).toBe(10);
    expect(scoreHolderTrend(-10)).toBe(3);
    expect(scoreHolderTrend(-20)).toBe(0);
    expect(scoreHolderTrend(40)).toBe(10);
  });

  it("explains itself", () => {
    const f = holderTrendFactor({ pct: -12.34, hours: 6 });
    expect(f.key).toBe("holders_trend");
    expect(f.explanation).toBe("Holder count -12.3% over 6.0h.");
  });
});
