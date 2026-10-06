import { describe, expect, it } from "vitest";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { assembleHealthFactors } from "./factors/assemble";
import { CHECKS, DOMAIN_INFO } from "./methodology";
import { HEALTH_GROUP_WEIGHTS } from "./score/config";

const period = { priceChangePct: null, buys: null, sells: null, volumeUsd: null };

const market = {
  periods: { m5: period, h1: period, h6: period, h24: period },
  liquidityUsd: null,
  marketCapUsd: null,
  pairCreatedAt: null,
  observedAt: "2026-10-06T00:00:00Z",
} as unknown as TokenMarketSnapshot;

const identity = {
  mintAuthority: "UNKNOWN",
  freezeAuthority: "UNKNOWN",
  creator: null,
  topHolderPct: null,
  topHolderPctExcludingKnown: null,
  topHolders: [],
  holderCount: null,
  rugged: null,
  lpLockedPctWeighted: null,
  insiderSupplyPct: null,
  transferFeePct: null,
  jupVerified: null,
  tokenDetectedAt: null,
} as unknown as TokenIdentitySnapshot;

describe("methodology page stays in sync with the scoring code", () => {
  it("documents exactly the checks the engine runs", () => {
    const live = assembleHealthFactors(market, identity, [])
      .map((f) => `${f.group}:${f.key}`)
      .sort();
    const documented = CHECKS.map((c) => `${c.domain}:${c.key}`).sort();
    expect(documented).toEqual(live);
  });

  it("documents every domain, and the weights add up to 1", () => {
    expect(Object.keys(DOMAIN_INFO).sort()).toEqual(
      Object.keys(HEALTH_GROUP_WEIGHTS).sort(),
    );
    const total = Object.values(HEALTH_GROUP_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
