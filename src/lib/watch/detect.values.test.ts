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

const ev = (b: Partial<WatchSnapshot>) => detectEvents(base, { ...base, ...b });
const kinds = (b: Partial<WatchSnapshot>) => ev(b).map((e) => e.kind);

describe("event values", () => {
  it("reports a 10% liquidity drop with its size", () => {
    const e = ev({ liquidityUsd: 90_000 })[0];
    expect(e.kind).toBe("LIQUIDITY_DROP");
    expect(e.value).toBe(10);
  });

  it("reports liquidity being added", () => {
    expect(ev({ liquidityUsd: 130_000 })[0].kind).toBe("LIQUIDITY_UP");
  });

  it("reports small price moves with their size", () => {
    expect(ev({ priceUsd: 1.04 })[0].value).toBe(4);
  });

  it("reports how much of the creator balance was sold", () => {
    const e = ev({ creatorBalance: 900 }).find((x) => x.kind === "CREATOR_SOLD");
    expect(e?.value).toBe(10);
  });
});

describe("exit pattern keeps its own bar", () => {
  it("is not raised by small moves", () => {
    expect(kinds({ creatorBalance: 940, liquidityUsd: 94_000 })).not.toContain("EXIT_PATTERN");
  });

  it("is raised when creator and liquidity both fall hard", () => {
    expect(kinds({ creatorBalance: 880, liquidityUsd: 80_000 })).toContain("EXIT_PATTERN");
  });
});
