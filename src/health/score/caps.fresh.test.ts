import { describe, expect, it } from "vitest";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { computeCaps } from "./caps";
import { buildPanel } from "./panel";

const p0 = { buys: null, sells: null, volumeUsd: null, priceChangePct: null };

const market = (pairCreatedAt: string | null) =>
  ({
    priceUsd: 0.00001,
    marketCapUsd: 20_000,
    liquidityUsd: null,
    pairAddress: "pool",
    pairCreatedAt,
    observedAt: "2026-10-07T12:00:00Z",
    periods: { m5: p0, h1: p0, h6: p0, h24: { ...p0, volumeUsd: 50_000 } },
  }) as unknown as TokenMarketSnapshot;

const identity = (tokenDetectedAt: string | null = null) =>
  ({
    rugged: false,
    mintAuthority: "REVOKED",
    freezeAuthority: "REVOKED",
    transferFeePct: null,
    topHolderPct: 8,
    topHolderPctExcludingKnown: 8,
    insiderSupplyPct: 2,
    holderCount: 300,
    riskFlags: [],
    tokenDetectedAt,
  }) as unknown as TokenIdentitySnapshot;

const find = (caps: { key: string; max: number }[], key: string) =>
  caps.find((c) => c.key === key);

describe("fresh launch vs drained pool", () => {
  it("caps a 5-minute-old token at 5, not 3", () => {
    const caps = computeCaps(market("2026-10-07T11:55:00Z"), identity(), null);
    expect(find(caps, "fresh_launch")?.max).toBe(5);
    expect(find(caps, "liquidity_unknown")).toBeUndefined();
  });

  it("keeps the hard 3.0 cap for an old pool with no liquidity", () => {
    const caps = computeCaps(market("2026-10-05T12:00:00Z"), identity(), null);
    expect(find(caps, "liquidity_unknown")?.max).toBe(3);
    expect(find(caps, "fresh_launch")).toBeUndefined();
  });

  it("treats a fresh token that once had liquidity as drained", () => {
    const caps = computeCaps(market("2026-10-07T11:55:00Z"), identity(), {
      priceUsd: null,
      liquidityUsd: 80_000,
    });
    expect(find(caps, "liquidity_unknown")?.max).toBe(3);
    expect(find(caps, "fresh_launch")).toBeUndefined();
  });

  it("does not guess when the age is unknown", () => {
    const caps = computeCaps(market(null), identity(), null);
    expect(find(caps, "liquidity_unknown")?.max).toBe(3);
  });

  it("falls back to the token detection time when the pair age is missing", () => {
    const caps = computeCaps(market(null), identity("2026-10-07T11:57:00Z"), null);
    expect(find(caps, "fresh_launch")?.max).toBe(5);
  });
});

describe("panel verdict for a fresh launch", () => {
  it("says too new to verify fully", () => {
    const p = buildPanel({
      factors: [],
      caps: [{ key: "fresh_launch", max: 5, reason: "Fresh launch." }],
      coverage: 0.5,
      missingCritical: true,
    });
    expect(p.verdict).toBe("Too new to verify fully");
  });
});
