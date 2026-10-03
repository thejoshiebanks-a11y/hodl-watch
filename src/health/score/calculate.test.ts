import { describe, expect, it } from "vitest";
import { calculateHealth } from "./calculate";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";

const market: TokenMarketSnapshot = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "TEST",
  name: "Test Token",
  priceUsd: 0.01,
  marketCapUsd: 1_000_000,
  liquidityUsd: 100_000,
  volume24hUsd: 250_000,
  priceChange5mPct: 0,
  priceChange1hPct: 0,
  pairAddress: "test-pair",
  dexId: "test-dex",
  quoteSymbol: "SOL",
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
  provider: "rugcheck",
};

describe("calculateHealth", () => {
  it("calculates a deterministic Health score from market and identity observations", () => {
    const result = calculateHealth(market, identity);

    expect(result.score.version).toBe("health-v0.1");
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
