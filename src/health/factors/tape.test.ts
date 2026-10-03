import { describe, expect, it } from "vitest";
import { scoreTape1h, scoreTape5m } from "./tape";

describe("tape factors", () => {
  it("returns null when data is unavailable", () => {
    expect(scoreTape5m(null)).toBeNull();
    expect(scoreTape1h(null)).toBeNull();
  });

  it("returns the highest stability contribution for a flat tape", () => {
    expect(scoreTape5m(0)?.score).toBe(10);
    expect(scoreTape1h(0)?.score).toBe(10);
  });

  it("does not reward large movement in either direction", () => {
    expect(scoreTape5m(50)?.score).toBeLessThan(10);
    expect(scoreTape5m(-50)?.score).toBeLessThan(10);
  });

  it("treats equal positive and negative movement symmetrically", () => {
    expect(scoreTape5m(10)?.score).toBe(scoreTape5m(-10)?.score);
    expect(scoreTape1h(25)?.score).toBe(scoreTape1h(-25)?.score);
  });

  it("penalizes extreme movement", () => {
    expect(scoreTape5m(100)?.score).toBeLessThan(1);
    expect(scoreTape5m(-100)?.score).toBeLessThan(1);
  });

  it("keeps scores bounded from 0 to 10", () => {
    for (const change of [-1000, -100, -50, -20, 0, 20, 50, 100, 1000]) {
      const fiveMinute = scoreTape5m(change)?.score;
      const oneHour = scoreTape1h(change)?.score;

      expect(fiveMinute).toBeGreaterThanOrEqual(0);
      expect(fiveMinute).toBeLessThanOrEqual(10);
      expect(oneHour).toBeGreaterThanOrEqual(0);
      expect(oneHour).toBeLessThanOrEqual(10);
    }
  });

  it("rejects non-finite observations", () => {
    expect(scoreTape5m(Number.NaN)).toBeNull();
    expect(scoreTape1h(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
