import { describe, expect, it } from "vitest";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { computeCaps } from "./caps";

const period = { buys: 100, sells: 100, volumeUsd: 1000, priceChangePct: 0 };

const market = (o: Partial<TokenMarketSnapshot> = {}): TokenMarketSnapshot =>
  ({
    mint: "m",
    symbol: null,
    name: null,
    priceUsd: 1,
    marketCapUsd: 1_000_000,
    fdvUsd: 1_000_000,
    liquidityUsd: 200_000,
    pairCreatedAt: "2020-01-01T00:00:00Z",
    periods: { m5: period, h1: period, h6: period, h24: period },
    observedAt: "2026-10-06T00:00:00Z",
    ...o,
  }) as TokenMarketSnapshot;

const identity = (o: Partial<TokenIdentitySnapshot> = {}): TokenIdentitySnapshot =>
  ({
    mint: "m",
    mintAuthority: "REVOKED",
    freezeAuthority: "REVOKED",
    topHolderPct: 5,
    topHolderPctExcludingKnown: 5,
    insiderSupplyPct: 2,
    transferFeePct: 0,
    rugged: false,
    ...o,
  }) as TokenIdentitySnapshot;

describe("computeCaps", () => {
  it("sets no cap for a clean token", () => {
    expect(computeCaps(market(), identity(), null)).toEqual([]);
  });

  it("caps a rugged token at 1", () => {
    const c = computeCaps(market(), identity({ rugged: true }), null);
    expect(c[0]).toMatchObject({ key: "rugged", max: 1 });
  });

  it("caps a 24h crash and tiny liquidity", () => {
    const m = market({
      liquidityUsd: 3_000,
      periods: {
        m5: period,
        h1: period,
        h6: period,
        h24: { ...period, priceChangePct: -85 },
      },
    });
    const c = computeCaps(m, identity(), null);
    expect(c[0].max).toBe(2);
    expect(c.map((x) => x.key)).toContain("liquidity_tiny");
  });

  it("caps a liquidity fall from the recorded peak", () => {
    const m = market({ liquidityUsd: 3_000 });
    const c = computeCaps(m, identity(), { priceUsd: null, liquidityUsd: 20_000 });
    expect(c.map((x) => x.key)).toContain("liquidity_peak_collapse");
  });

  it("caps live mint authority", () => {
    const c = computeCaps(market(), identity({ mintAuthority: "SET" }), null);
    expect(c[0]).toMatchObject({ key: "mint_authority", max: 4.5 });
  });
});
