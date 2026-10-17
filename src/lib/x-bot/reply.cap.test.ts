import { describe, it, expect } from "vitest";
import { formatReply, capLine, toReplyInput, type ReplyInput } from "./reply";
import type { ScanSuccess } from "../types/scan";

const base: ReplyInput = {
  symbol: "KILOS",
  score: 4.5,
  scored: 25,
  available: 28,
  partial: false,
  liquidityUsd: 32191,
  marketCapUsd: 1_200_000,
  ageHours: 72,
  mintAuthority: "SET",
  freezeAuthority: "REVOKED",
  lpLockedPct: 0,
  topHolderPct: 8.44,
  holderCount: 1234,
  insiderSupplyPct: 3.1,
  change24hPct: -12.4,
  volume24hUsd: 73600,
  buys24h: 410,
  sells24h: 380,
  flags: [],
  cap: null,
};

const cap = {
  max: 4.5,
  reason: "Mint authority is still set, so supply can be inflated.",
};

describe("cap line", () => {
  it("explains what limited the score, right after the headline", () => {
    const lines = formatReply({ ...base, cap }).split("\n");
    expect(lines[1]).toBe(
      "Capped at 4.5: Mint authority is still set, so supply can be inflated",
    );
  });

  it("uses only the first sentence", () => {
    expect(
      capLine({
        max: 3,
        reason:
          "Liquidity could not be read while the token still trades. A drained pool looks like this, and exit liquidity cannot be verified.",
      }),
    ).toBe("Capped at 3.0: Liquidity could not be read while the token still trades");
  });

  it("cleans unsafe text", () => {
    const line = capLine({ max: 5, reason: "see evil.com @bob https://x.io" })!;
    expect(line).not.toMatch(/@|:\/\/|[A-Za-z]\.[A-Za-z]/);
  });

  it("returns nothing without a cap", () => {
    expect(capLine(null)).toBeNull();
    expect(formatReply(base)).not.toContain("Capped");
  });

  it("is the last line dropped when space runs out", () => {
    const t = formatReply({ ...base, cap }, { maxLen: 140 });
    expect(t).toContain("Capped at 4.5");
    expect(t).not.toContain("24h");
    expect(t.endsWith("Not financial advice.")).toBe(true);
  });
});

describe("toReplyInput caps", () => {
  const data = (score: number, uncappedScore: number | undefined) =>
    ({
      market: {
        symbol: "K",
        liquidityUsd: 1,
        marketCapUsd: 1,
        pairCreatedAt: null,
        observedAt: "2026-10-18T00:00:00.000Z",
        periods: {
          h24: { priceChangePct: null, volumeUsd: null, buys: null, sells: null },
        },
      },
      identity: {
        mintAuthority: "SET",
        freezeAuthority: "REVOKED",
        topHolderPct: null,
        holderCount: null,
        insiderSupplyPct: null,
        lpLockedPctWeighted: null,
        riskFlags: null,
      },
      health: {
        score,
        uncappedScore,
        scoredFactors: 1,
        availableFactors: 1,
        partial: false,
        missingCritical: false,
        caps: [{ key: "mint_authority", max: 4.5, reason: "Mint authority is still set." }],
      },
    }) as unknown as ScanSuccess["data"];

  it("includes the cap that lowered the score", () => {
    expect(toReplyInput(data(4.5, 7.1)).cap).toEqual({
      max: 4.5,
      reason: "Mint authority is still set.",
    });
  });
  it("ignores a cap that did not change the score", () => {
    expect(toReplyInput(data(4.2, 4.2)).cap).toBeNull();
  });
  it("ignores caps when the uncapped score is unknown", () => {
    expect(toReplyInput(data(4.5, undefined)).cap).toBeNull();
  });
});
