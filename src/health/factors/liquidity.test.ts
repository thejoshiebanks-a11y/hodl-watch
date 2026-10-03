import { describe, expect, it } from "vitest";
import {
  scoreLiquidityUsd,
  scoreLiquidityRatio,
} from "./liquidity";

describe("liquidity factors", () => {
  it("returns null when liquidity is unavailable", () => {
    expect(scoreLiquidityUsd(null)).toBeNull();
  });

  it("returns null for invalid liquidity values", () => {
    expect(scoreLiquidityUsd(0)).toBeNull();
    expect(scoreLiquidityUsd(-1)).toBeNull();
    expect(scoreLiquidityUsd(Number.NaN)).toBeNull();
    expect(scoreLiquidityUsd(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("keeps absolute liquidity scores between 0 and 10", () => {
    for (const liquidity of [1, 1000, 10_000, 100_000, 1_000_000, 10_000_000, 1_000_000_000]) {
      const score = scoreLiquidityUsd(liquidity)?.score;

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it("matches the documented absolute-liquidity reference points", () => {
    expect(scoreLiquidityUsd(1_000)?.score).toBe(0);
    expect(scoreLiquidityUsd(100_000)?.score).toBe(5);
    expect(scoreLiquidityUsd(10_000_000)?.score).toBe(10);
  });

  it("increases as absolute liquidity increases", () => {
    const low = scoreLiquidityUsd(10_000)?.score ?? 0;
    const high = scoreLiquidityUsd(1_000_000)?.score ?? 0;

    expect(high).toBeGreaterThan(low);
  });

  it("returns null when ratio inputs are unavailable", () => {
    expect(scoreLiquidityRatio(null, 1_000_000)).toBeNull();
    expect(scoreLiquidityRatio(100_000, null)).toBeNull();
  });

  it("returns null for invalid ratio inputs", () => {
    expect(scoreLiquidityRatio(0, 1_000_000)).toBeNull();
    expect(scoreLiquidityRatio(100_000, 0)).toBeNull();
    expect(scoreLiquidityRatio(-1, 1_000_000)).toBeNull();
    expect(scoreLiquidityRatio(100_000, -1)).toBeNull();
  });

  it("keeps liquidity ratio scores between 0 and 10", () => {
    const ratios = [
      [10_000, 1_000_000],
      [100_000, 1_000_000],
      [500_000, 1_000_000],
      [1_000_000, 1_000_000],
    ];

    for (const [liquidity, marketCap] of ratios) {
      const score = scoreLiquidityRatio(liquidity, marketCap)?.score;

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it("scores a stronger liquidity ratio higher", () => {
    const weak = scoreLiquidityRatio(50_000, 1_000_000)?.score ?? 0;
    const strong = scoreLiquidityRatio(500_000, 1_000_000)?.score ?? 0;

    expect(strong).toBeGreaterThan(weak);
  });
});
