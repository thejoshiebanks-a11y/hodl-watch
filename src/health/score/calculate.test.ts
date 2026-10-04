import { describe, expect, it } from "vitest";
import { calculateHealth } from "./calculate";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";

const market: TokenMarketSnapshot = {
  mint: "mint",
  symbol: "TEST",
  name: "Test",
  priceUsd: 1,
  marketCapUsd: 1_000_000,
  fdvUsd: 1_200_000,
  liquidityUsd: 100_000,
  liquidityBase: 50_000,
  liquidityQuote: 500,
  pairAddress: "pair",
  dexId: "raydium",
  quoteSymbol: "SOL",
  pairCreatedAt: null,
  periods: {
    m5: {
      buys: null,
      sells: null,
      volumeUsd: null,
      priceChangePct: 0,
    },
    h1: {
      buys: null,
      sells: null,
      volumeUsd: null,
      priceChangePct: 0,
    },
    h6: {
      buys: null,
      sells: null,
      volumeUsd: null,
      priceChangePct: null,
    },
    h24: {
      buys: null,
      sells: null,
      volumeUsd: 250_000,
      priceChangePct: null,
    },
  },
  websites: [],
  socials: [],
  activeBoosts: null,
  observedAt: "2026-01-01T00:00:00.000Z",
  provider: "dexscreener",
};

const identity: TokenIdentitySnapshot = {
  mint: market.mint,
  mintAuthority: "REVOKED",
  freezeAuthority: "REVOKED",
  creator: "creator",
  topHolderPct: 10,
  holderCount: 100,
  observedAt: "2026-01-01T00:00:00.000Z",
  topHolderPctExcludingKnown: 10,
  topHolders: [],
  creatorBalance: 0,
  rugged: false,
  launchpad: null,
  tokenDetectedAt: null,
  jupVerified: null,
  insiderHolderCount: null,
  transferFeePct: 0,
  insiderNetworkCount: null,
  insiderSupplyPct: null,
  lpLockedPctWeighted: null,
  lpLockedUsd: null,
  poolCount: null,
  poolLiquidityUsd: null,
  largestPoolLockedPct: null,
  provider: "rugcheck",
};

describe("calculateHealth", () => {
  it("calculates a deterministic Health score from market and identity observations", () => {
    const result = calculateHealth(market, identity);

    expect(result.score.version).toBe("health-v0.1.2");
    expect(result.score.score).not.toBeNull();
    expect(result.score.score).toBeGreaterThanOrEqual(0);
    expect(result.score.score).toBeLessThanOrEqual(10);
    expect(result.score.coverage).toBeGreaterThan(0);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it("produces the same result for the same observations", () => {
    expect(calculateHealth(market, identity)).toEqual(
      calculateHealth(market, identity),
    );
  });
});
