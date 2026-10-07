import { describe, expect, it } from "vitest";
import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";
import { computeCaps } from "./caps";
import { buildPanel } from "./panel";

const p0 = { buys: null, sells: null, volumeUsd: null, priceChangePct: null };
const market = {
  priceUsd: 1,
  marketCapUsd: 1_000_000,
  liquidityUsd: 200_000,
  pairAddress: "pool",
  pairCreatedAt: "2026-01-01T00:00:00Z",
  observedAt: "2026-10-07T00:00:00Z",
  periods: { m5: p0, h1: p0, h6: p0, h24: p0 },
} as unknown as TokenMarketSnapshot;

const identity = (riskFlags: { name: string; level: string }[] | null) =>
  ({
    rugged: false,
    mintAuthority: "REVOKED",
    freezeAuthority: "REVOKED",
    transferFeePct: null,
    topHolderPct: 3,
    topHolderPctExcludingKnown: 3,
    insiderSupplyPct: 2,
    holderCount: 20_000,
    riskFlags,
  }) as unknown as TokenIdentitySnapshot;

const base = { factors: [], caps: [], coverage: 0.9, missingCritical: false };

describe("permanent control cap", () => {
  it("caps the score at 3 when RugCheck flags it", () => {
    const caps = computeCaps(
      market,
      identity([{ name: "Permanent Control Enabled", level: "danger" }]),
      null,
    );
    expect(caps[0].key).toBe("permanent_control");
    expect(caps[0].max).toBe(3);
  });

  it("does nothing without the flag", () => {
    expect(computeCaps(market, identity([]), null)).toEqual([]);
    expect(computeCaps(market, identity(null), null)).toEqual([]);
  });
});

describe("RugCheck flags in the panel", () => {
  it("lists flags we do not already score", () => {
    const p = buildPanel({
      ...base,
      riskFlags: [
        { name: "Mutable metadata", level: "warn" },
        { name: "Missing file metadata", level: "warn" },
      ],
    });
    expect(p.reasons[0].text).toBe(
      "RugCheck also flags: Mutable metadata (warning), Missing file metadata (warning).",
    );
  });

  it("does not repeat flags our own checks already cover", () => {
    const p = buildPanel({
      ...base,
      riskFlags: [
        { name: "Mint Authority still enabled", level: "danger" },
        { name: "Low Liquidity", level: "danger" },
      ],
    });
    expect(p.reasons).toEqual([]);
  });

  it("ignores info-level flags", () => {
    const p = buildPanel({ ...base, riskFlags: [{ name: "Something minor", level: "info" }] });
    expect(p.reasons).toEqual([]);
  });
});
