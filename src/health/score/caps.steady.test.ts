import { describe, expect, it } from "vitest";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { computeCaps } from "./caps";

const NOW = "2026-10-07T10:00:00.000Z";
const period = (pct: number | null) => ({
  buys: 100,
  sells: 100,
  volumeUsd: 1_000_000,
  priceChangePct: pct,
});

function build(opts: {
  d24: number;
  d6: number | null;
  d1: number | null;
  liq?: number;
  holders?: number;
}) {
  const market = {
    mint: "TEST",
    liquidityUsd: opts.liq ?? 190_000,
    marketCapUsd: 1_700_000,
    pairAddress: "pair",
    pairCreatedAt: "2026-10-01T10:00:00.000Z",
    observedAt: NOW,
    periods: {
      h1: period(opts.d1),
      h6: period(opts.d6),
      h24: period(opts.d24),
    },
  } as unknown as TokenMarketSnapshot;
  const identity = {
    holderCount: opts.holders ?? 35_000,
  } as unknown as TokenIdentitySnapshot;
  return computeCaps(market, identity, null);
}

const fall = (caps: ReturnType<typeof build>) =>
  caps.find((c) => c.key.startsWith("fall_"));

describe("graded 24h fall cap", () => {
  it("lifts to 6.5 when structure held and price has steadied", () => {
    const c = fall(build({ d24: -55, d6: -5, d1: 1 }))!;
    expect(c.key).toBe("fall_24h_held_steady");
    expect(c.max).toBe(6.5);
  });

  it("stays at 5 when price is still falling", () => {
    const c = fall(build({ d24: -55, d6: -5, d1: -8 }))!;
    expect(c.key).toBe("fall_24h_held");
    expect(c.max).toBe(5);
  });

  it("stays at 5 when the 6h reading is missing", () => {
    const c = fall(build({ d24: -55, d6: null, d1: 1 }))!;
    expect(c.key).toBe("fall_24h_held");
  });

  it("does not lift when structure is weak", () => {
    const c = fall(build({ d24: -55, d6: -5, d1: 1, liq: 30_000, holders: 800 }))!;
    expect(c.key).toBe("fall_24h");
    expect(c.max).toBe(3.5);
  });
});
