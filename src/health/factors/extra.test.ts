import { describe, expect, it } from "vitest";
import {
  scoreAge,
  scoreCreatorAllocation,
  scorePriceImpact,
  scoreTop10ExcludingKnown,
  scoreVolumeToLiquidity,
} from "./extra";

describe("extra factors", () => {
  it("price impact falls as liquidity rises", () => {
    expect(scorePriceImpact(10_000)!.score).toBeLessThan(
      scorePriceImpact(300_000)!.score,
    );
  });

  it("returns null when data is missing", () => {
    expect(scorePriceImpact(null)).toBeNull();
    expect(scoreVolumeToLiquidity(100, 0)).toBeNull();
    expect(scoreTop10ExcludingKnown([])).toBeNull();
    expect(scoreCreatorAllocation(null, [])).toBeNull();
  });

  it("scores young pools lower than old ones", () => {
    const now = "2026-10-04T12:00:00Z";
    const young = scoreAge("2026-10-04T11:30:00Z", now, "Pool")!;
    const old = scoreAge("2026-09-01T00:00:00Z", now, "Pool")!;
    expect(young.score).toBeLessThan(old.score);
  });
});
