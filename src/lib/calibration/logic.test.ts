import { describe, expect, it } from "vitest";
import { bucketOf, labelOutcome, summarize, type CalibRecord } from "./logic";

const before = { priceUsd: 1, liquidityUsd: 100 };

describe("labelOutcome", () => {
  it("marks a vanished market as gone", () => {
    expect(labelOutcome(before, null).label).toBe("gone");
  });

  it("marks a 80% price fall as collapsed", () => {
    expect(labelOutcome(before, { priceUsd: 0.2, liquidityUsd: 90 }).label).toBe("collapsed");
  });

  it("marks a liquidity collapse as collapsed even if price held", () => {
    expect(labelOutcome(before, { priceUsd: 1, liquidityUsd: 20 }).label).toBe("collapsed");
  });

  it("marks a 40% fall as declined and a small move as held", () => {
    expect(labelOutcome(before, { priceUsd: 0.6, liquidityUsd: 90 }).label).toBe("declined");
    expect(labelOutcome(before, { priceUsd: 0.9, liquidityUsd: 95 }).label).toBe("held");
  });

  it("returns unknown when nothing can be compared", () => {
    const none = { priceUsd: null, liquidityUsd: null };
    expect(labelOutcome(none, { priceUsd: 1, liquidityUsd: 1 }).label).toBe("unknown");
  });
});

describe("bucketOf and summarize", () => {
  it("buckets by score and treats partial separately", () => {
    expect(bucketOf({ health: 8, partial: false })).toBe("7.5+");
    expect(bucketOf({ health: 3, partial: false })).toBe("0-4");
    expect(bucketOf({ health: 9, partial: true })).toBe("partial");
    expect(bucketOf({ health: null, partial: false })).toBe("unscored");
  });

  it("reports the bad-outcome rate per bucket", () => {
    const rec = (id: string, label: "collapsed" | "held"): CalibRecord => ({
      id,
      mint: id,
      symbol: null,
      at: "2026-10-06T00:00:00Z",
      health: 8,
      partial: false,
      coverage: 1,
      domains: {},
      priceUsd: 1,
      liquidityUsd: 100,
      outcome: { at: "2026-10-07T00:00:00Z", label, priceChangePct: null, liquidityChangePct: null },
    });
    const s = summarize([rec("a", "collapsed"), rec("b", "held")]);
    expect(s.buckets[0]).toMatchObject({ bucket: "7.5+", n: 2, badRatePct: 50 });
    expect(s.warning).not.toBeNull();
  });
});
