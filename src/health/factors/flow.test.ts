import { describe, expect, it } from "vitest";
import { scoreFlow } from "./flow";

describe("flow factor", () => {
  it("returns null when data is missing", () => {
    expect(scoreFlow(null, 10)).toBeNull();
    expect(scoreFlow(10, null)).toBeNull();
  });

  it("returns null below the minimum transaction count", () => {
    expect(scoreFlow(5, 5)).toBeNull();
  });

  it("scores balanced flow at 7", () => {
    expect(scoreFlow(50, 50)?.score).toBe(7);
  });

  it("scores all-buys at 10 and all-sells at 0", () => {
    expect(scoreFlow(100, 0)?.score).toBe(10);
    expect(scoreFlow(0, 100)?.score).toBe(0);
  });

  it("scores a buy-led real sample slightly above balanced", () => {
    const result = scoreFlow(523, 350);
    expect(result?.score).toBeCloseTo(7.6, 1);
  });

  it("penalizes sell pressure more than it rewards buy pressure", () => {
    const buyLed = scoreFlow(70, 30)?.score ?? 0;
    const sellLed = scoreFlow(30, 70)?.score ?? 0;
    expect(7 - sellLed).toBeGreaterThan(buyLed - 7);
  });
});
