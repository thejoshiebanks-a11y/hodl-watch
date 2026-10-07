import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/types/chart";
import { scoreVolatility } from "./candles";

const choppy = (n: number, step: number): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const c = i % 2 ? 101 : 100;
    return {
      time: 1_000_000 + i * step,
      open: c,
      high: c * 1.005,
      low: c * 0.995,
      close: c,
      volume: 1,
    };
  });

describe("volatility with different candle sizes", () => {
  it("needs 12 candles whatever their size", () => {
    expect(scoreVolatility(choppy(8, 300), 5)).toBeNull();
    expect(scoreVolatility(choppy(14, 300), 5)).not.toBeNull();
  });

  it("treats the same moves on 5m candles as more volatile than on 15m candles", () => {
    const s5 = scoreVolatility(choppy(20, 300), 5)!;
    const s15 = scoreVolatility(choppy(20, 900), 15)!;
    expect(s5.score).toBeLessThan(s15.score);
    expect(s5.explanation).toContain("scaled from 5m");
  });
});
