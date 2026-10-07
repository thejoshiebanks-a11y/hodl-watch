import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/types/chart";
import { scoreDrawdown, scoreRecovery, scoreVolatility } from "./candles";

const flat = (n: number, gap: number) =>
  Array.from({ length: n }, (_, i) => ({
    time: 1_000_000 + i * gap,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 1,
  })) as unknown as Candle[];

describe("brand-new pool, 1m candles", () => {
  it("reads 5 one-minute candles", () => {
    const c = flat(5, 60);
    expect(scoreDrawdown(c)).not.toBeNull();
    expect(scoreVolatility(c, 1)).not.toBeNull();
    expect(scoreRecovery(c)).not.toBeNull();
  });
  it("refuses 4 one-minute candles", () => {
    expect(scoreDrawdown(flat(4, 60))).toBeNull();
  });
  it("keeps 8 for 5m and 12 for 15m", () => {
    expect(scoreDrawdown(flat(7, 300))).toBeNull();
    expect(scoreDrawdown(flat(8, 300))).not.toBeNull();
    expect(scoreDrawdown(flat(11, 900))).toBeNull();
  });
});
