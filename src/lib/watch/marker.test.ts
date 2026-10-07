import { describe, expect, it } from "vitest";
import { markerFor, snapTime } from "./marker";

describe("markerFor", () => {
  it("labels a liquidity drop with its size", () => {
    expect(markerFor({ kind: "LIQUIDITY_DROP", value: 10 })).toEqual({
      text: "Liq −10%",
      shape: "arrowDown",
      position: "aboveBar",
    });
  });

  it("puts rises below the bar and rounds the size", () => {
    const m = markerFor({ kind: "PRICE_SPIKE", value: 12.34 });
    expect(m.text).toBe("Price +12.3%");
    expect(m.position).toBe("belowBar");
  });

  it("handles alerts without a size and unknown kinds", () => {
    expect(markerFor({ kind: "RUGGED" }).text).toBe("Rugged");
    expect(markerFor({ kind: "SOMETHING_NEW" }).text).toBe("something new");
  });
});

describe("snapTime", () => {
  const times = [100, 160, 220, 280];

  it("skips events before the first candle", () => {
    expect(snapTime(times, 99)).toBeNull();
    expect(snapTime([], 5)).toBeNull();
  });

  it("picks the candle the event happened in", () => {
    expect(snapTime(times, 100)).toBe(100);
    expect(snapTime(times, 200)).toBe(160);
    expect(snapTime(times, 9999)).toBe(280);
  });
});
