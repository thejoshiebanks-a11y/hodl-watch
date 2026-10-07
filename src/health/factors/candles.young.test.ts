import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/types/chart";
import {
  scoreDrawdown,
  scoreRecovery,
  scoreVolatility,
} from "./candles";

const flat = (n: number, gapSeconds: number) =>
  Array.from({ length: n }, (_, i) => ({
    time: 1_000_000 + i * gapSeconds,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 1,
  })) as unknown as Candle[];

describe("young-token candle minimum", () => {
  it("reads 9 five-minute candles", () => {
    const c = flat(9, 300);
    expect(scoreDrawdown(c)).not.toBeNull();
    expect(scoreVolatility(c, 5)).not.toBeNull();
    expect(scoreRecovery(c)).not.toBeNull();
  });

  it("still refuses 6 five-minute candles", () => {
    expect(scoreDrawdown(flat(6, 300))).toBeNull();
  });

  it("keeps the 12-candle rule for 15-minute candles", () => {
    expect(scoreDrawdown(flat(9, 900))).toBeNull();
    expect(scoreDrawdown(flat(12, 900))).not.toBeNull();
  });
});
