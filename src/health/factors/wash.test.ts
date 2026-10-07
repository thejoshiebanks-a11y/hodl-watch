import { describe, expect, it } from "vitest";
import { scoreTradesPerHolder, scoreVolumeToMarketCap } from "./wash";

describe("scoreVolumeToMarketCap", () => {
  it("is clean for a normal ratio", () => {
    expect(scoreVolumeToMarketCap(3_200_000, 6_900_000)?.score).toBe(10);
  });

  it("flags a ratio near 27x", () => {
    const s = scoreVolumeToMarketCap(99_200, 3_700)?.score ?? 99;
    expect(s).toBeGreaterThan(2);
    expect(s).toBeLessThan(4);
  });

  it("bottoms out at 60x and above", () => {
    expect(scoreVolumeToMarketCap(600_000, 10_000)?.score).toBe(0);
  });

  it("returns nothing without both numbers", () => {
    expect(scoreVolumeToMarketCap(null, 1000)).toBeNull();
    expect(scoreVolumeToMarketCap(1000, 0)).toBeNull();
  });
});

describe("scoreTradesPerHolder", () => {
  it("needs enough trades to judge", () => {
    expect(scoreTradesPerHolder(30, 20, 100)).toBeNull();
  });

  it("is clean for a wide holder base", () => {
    expect(scoreTradesPerHolder(60_000, 40_000, 43_796)?.score).toBe(10);
  });

  it("flags a few holders doing most of the trading", () => {
    const s = scoreTradesPerHolder(2_500, 2_500, 300)?.score ?? 99;
    expect(s).toBeGreaterThan(7);
    expect(s).toBeLessThan(8.5);
    expect(scoreTradesPerHolder(10_000, 10_000, 200)?.score).toBe(0);
  });

  it("returns nothing without a holder count", () => {
    expect(scoreTradesPerHolder(500, 500, null)).toBeNull();
  });
});
