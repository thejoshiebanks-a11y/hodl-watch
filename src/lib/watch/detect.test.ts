import { describe, expect, it } from "vitest";
import { detectEvents } from "./detect";
import type { WatchSnapshot } from "./snapshot";

const base: WatchSnapshot = {
  mint: "m",
  symbol: "T",
  at: "2026-10-06T10:00:00Z",
  health: 8,
  partial: false,
  domains: { MARKET: 9, LIQUIDITY: 7, FLOW: 8 },
  priceUsd: 1,
  liquidityUsd: 100_000,
  volume1hUsd: 1_000,
  volume24hUsd: 24_000,
  buyShare: 60,
  flowWindow: "1h",
  lpLockedPct: 80,
  topHolderPct: 5,
  holderCount: 1000,
  insiderSupplyPct: 5,
  creatorBalance: 1000,
  rugged: false,
  mintAuthority: "REVOKED",
  freezeAuthority: "REVOKED",
  transferFeePct: 0,
  poolCount: 2,
};

const kinds = (a: WatchSnapshot, b: WatchSnapshot) =>
  detectEvents(a, b).map((e) => e.kind);

describe("detectEvents", () => {
  it("is quiet when nothing changed", () => {
    expect(detectEvents(base, { ...base })).toEqual([]);
  });

  it("explains a Health drop with the domains that moved", () => {
    const e = detectEvents(base, {
      ...base,
      health: 6.5,
      domains: { MARKET: 9, LIQUIDITY: 5.5, FLOW: 7 },
    })[0];
    expect(e.kind).toBe("HEALTH_DROP");
    expect(e.detail).toContain("Liquidity");
  });

  it("flags liquidity falling and LP lock falling", () => {
    const k = kinds(base, { ...base, liquidityUsd: 60_000, lpLockedPct: 50 });
    expect(k).toContain("LIQUIDITY_DROP");
    expect(k).toContain("LP_LOCK_DROP");
  });

  it("flags a flow flip to sell-led", () => {
    expect(kinds(base, { ...base, buyShare: 40 })).toContain("FLOW_SELL_LED");
  });

  it("does not alert when the flow window is too thin to judge", () => {
    expect(kinds(base, { ...base, buyShare: null })).not.toContain("FLOW_SELL_LED");
  });

  it("raises critical alerts for rug and authority changes", () => {
    const e = detectEvents(base, {
      ...base,
      rugged: true,
      mintAuthority: "SET",
      transferFeePct: 5,
    });
    expect(e.every((x) => x.severity === "critical")).toBe(true);
    expect(e.map((x) => x.kind)).toEqual(
      expect.arrayContaining(["RUGGED", "MINT_AUTHORITY_BACK", "TRANSFER_FEE"]),
    );
  });

  it("combines creator selling with a liquidity drop into one exit pattern", () => {
    const k = kinds(base, { ...base, creatorBalance: 500, liquidityUsd: 60_000 });
    expect(k).toContain("CREATOR_SOLD");
    expect(k).toContain("EXIT_PATTERN");
  });

  it("sorts critical before warning before info", () => {
    const e = detectEvents(base, {
      ...base,
      priceUsd: 1.5,
      holderCount: 800,
      rugged: true,
    });
    expect(e[0].severity).toBe("critical");
    expect(e[e.length - 1].severity).toBe("info");
  });
});
