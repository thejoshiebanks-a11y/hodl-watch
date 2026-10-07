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
  it("needs 8 candles at 5m and 12 at 15m", () => {
    const mk = (n: number, gap: number) =>
      Array.from({ length: n }, (_, i) => ({
        time: 1_000_000 + i * gap,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1,
      })) as never;
    expect(scoreVolatility(mk(7, 300), 5)).toBeNull();
    expect(scoreVolatility(mk(8, 300), 5)).not.toBeNull();
    expect(scoreVolatility(mk(11, 900), 15)).toBeNull();
    expect(scoreVolatility(mk(12, 900), 15)).not.toBeNull();
  });

  it("treats the same moves on 5m candles as more volatile than on 15m candles", () => {
    const s5 = scoreVolatility(choppy(20, 300), 5)!;
    const s15 = scoreVolatility(choppy(20, 900), 15)!;
    expect(s5.score).toBeLessThan(s15.score);
    expect(s5.explanation).toContain("scaled from 5m");
  });
});
