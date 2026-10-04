import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/types/chart";
import { scoreDrawdown, scoreRecovery, scoreVolatility } from "./candles";

const mk = (closes: number[]): Candle[] =>
  closes.map((c, i) => ({
    time: 1_000_000 + i * 900,
    open: c,
    high: c * 1.01,
    low: c * 0.99,
    close: c,
    volume: 1,
  }));

const flat = (n: number, v = 100) => Array.from({ length: n }, () => v);

describe("candle factors", () => {
  it("returns null when candles are missing or too few", () => {
    expect(scoreDrawdown(null)).toBeNull();
    expect(scoreVolatility(mk(flat(5)))).toBeNull();
    expect(scoreRecovery([])).toBeNull();
  });

  it("scores a deep drawdown lower than a flat market", () => {
    const calm = scoreDrawdown(mk(flat(20)))!;
    const crashed = scoreDrawdown(mk([...flat(15), 50]))!;
    expect(crashed.score).toBeLessThan(calm.score);
  });

  it("scores choppy prices lower than steady prices", () => {
    const steady = scoreVolatility(mk(flat(20)))!;
    const wild = scoreVolatility(
      mk(Array.from({ length: 20 }, (_, i) => (i % 2 ? 100 : 130))),
    )!;
    expect(wild.score).toBeLessThan(steady.score);
  });

  it("scores a stronger rebound higher", () => {
    const stuck = scoreRecovery(mk([...flat(10), 50, 50, 50]))!;
    const rebound = scoreRecovery(mk([...flat(10), 50, 70, 90]))!;
    expect(rebound.score).toBeGreaterThan(stuck.score);
  });
});
