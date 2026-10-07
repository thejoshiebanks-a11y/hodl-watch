import { describe, expect, it } from "vitest";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { assembleHealthFactors } from "../factors/assemble";
import { computeCaps } from "./caps";

const period = (over: Record<string, unknown> = {}) => ({
  buys: null,
  sells: null,
  volumeUsd: null,
  priceChangePct: null,
  ...over,
});

const market = (
  over: Record<string, unknown> = {},
  periods: Record<string, unknown> = {},
) =>
  ({
    mint: "m",
    priceUsd: 1,
    marketCapUsd: 6_900_000,
    liquidityUsd: 505_800,
    pairAddress: "pool",
    pairCreatedAt: "2026-01-01T00:00:00Z",
    observedAt: "2026-10-07T00:00:00Z",
    periods: { m5: period(), h1: period(), h6: period(), h24: period(), ...periods },
    ...over,
  }) as unknown as TokenMarketSnapshot;

const identity = (over: Record<string, unknown> = {}) =>
  ({
    mint: "m",
    rugged: false,
    mintAuthority: "REVOKED",
    freezeAuthority: "REVOKED",
    transferFeePct: null,
    topHolderPct: 3,
    topHolderPctExcludingKnown: 3,
    insiderSupplyPct: 2,
    holderCount: 43_796,
    topHolders: [],
    creator: null,
    jupVerified: null,
    tokenDetectedAt: null,
    lpLockedPctWeighted: 100,
    ...over,
  }) as unknown as TokenIdentitySnapshot;

const lowest = (caps: ReturnType<typeof computeCaps>) => caps[0];

describe("missing liquidity", () => {
  it("caps a token that trades but reports no liquidity", () => {
    const caps = computeCaps(
      market({ liquidityUsd: null, marketCapUsd: 3_700 }, { h24: period({ volumeUsd: 99_200 }) }),
      identity({ holderCount: 376 }),
      null,
    );
    expect(lowest(caps).key).toBe("liquidity_unknown");
    expect(lowest(caps).max).toBe(3);
  });

  it("caps a pool with zero liquidity harder", () => {
    const caps = computeCaps(market({ liquidityUsd: 0 }), identity(), null);
    expect(lowest(caps).key).toBe("liquidity_zero");
    expect(lowest(caps).max).toBe(1.5);
  });

  it("does not count an LP lock when there is no liquidity", () => {
    const f = assembleHealthFactors(market({ liquidityUsd: null }), identity());
    expect(f.find((x) => x.key === "liquidity_lp_lock")?.status).toBe("N/A");
  });
});

describe("a deep 24h fall", () => {
  const fall = { h24: period({ priceChangePct: -53 }) };

  it("is eased when liquidity and holders held up", () => {
    const c = lowest(computeCaps(market({}, fall), identity(), null));
    expect(c.key).toBe("fall_24h_held");
    expect(c.max).toBe(5);
  });

  it("keeps the harder cap when liquidity is thin", () => {
    const c = lowest(
      computeCaps(market({ liquidityUsd: 30_000 }, fall), identity(), null),
    );
    expect(c.key).toBe("fall_24h");
    expect(c.max).toBe(3.5);
  });

  it("keeps the harder cap when liquidity drained from its peak", () => {
    const c = lowest(
      computeCaps(market({}, fall), identity(), { priceUsd: null, liquidityUsd: 800_000 }),
    );
    expect(c.max).toBeLessThanOrEqual(3.5);
  });

  it("never eases a collapse of 70% or more", () => {
    const c = lowest(
      computeCaps(market({}, { h24: period({ priceChangePct: -75 }) }), identity(), null),
    );
    expect(c.key).toBe("crash_24h");
    expect(c.max).toBe(2);
  });
});
