import { describe, it, expect } from "vitest";
import {
  formatReply,
  safeSymbol,
  toReplyInput,
  notFoundReply,
  type ReplyInput,
} from "./reply";
import type { ScanSuccess } from "../types/scan";

const base: ReplyInput = {
  symbol: "KILOS",
  score: 7,
  scored: 25,
  available: 28,
  partial: false,
  liquidityUsd: 32191,
  marketCapUsd: 1_200_000,
  mintAuthority: "REVOKED",
  freezeAuthority: "REVOKED",
  topHolderPct: 8.44,
  lpLockedPct: 0,
};

describe("formatReply", () => {
  it("writes the full reply", () => {
    const t = formatReply(base);
    expect(t).toContain("$KILOS Health 7.0/10");
    expect(t).toContain("25/28 checks observed");
    expect(t).toContain("Liquidity $32.2K · MC $1.2M");
    expect(t).toContain("Mint auth: revoked · Freeze auth: revoked");
    expect(t).toContain("Top holder: 8.4% · LP locked: 0.0%");
    expect(t.endsWith("Not financial advice.")).toBe(true);
  });

  it("flags partial data", () => {
    expect(formatReply({ ...base, partial: true })).toContain("(partial data)");
  });

  it("shows N/A instead of guessing", () => {
    const t = formatReply({
      ...base,
      score: null,
      liquidityUsd: null,
      mintAuthority: "UNKNOWN",
      topHolderPct: null,
    });
    expect(t).toContain("Health N/A");
    expect(t).toContain("Liquidity N/A");
    expect(t).toContain("Mint auth: N/A");
    expect(t).toContain("Top holder: N/A");
  });

  it("never exceeds the limit and keeps the key lines", () => {
    const t = formatReply(base, 80);
    expect(t.length).toBeLessThanOrEqual(80);
    expect(t).toContain("$KILOS Health 7.0/10");
    expect(t.endsWith("Not financial advice.")).toBe(true);
  });

  it("contains no links or mentions even for a hostile symbol", () => {
    const t = formatReply({ ...base, symbol: "@elonmusk https://evil.com" });
    expect(t).not.toMatch(/@|https?:|\.com/i);
  });
});

describe("safeSymbol", () => {
  it("strips unsafe characters", () => {
    expect(safeSymbol("scam.com")).toBe("scamcom");
    expect(safeSymbol("@bob")).toBe("bob");
  });
  it("returns null for nothing usable", () => {
    expect(safeSymbol("🔥🔥")).toBeNull();
    expect(safeSymbol(null)).toBeNull();
  });
  it("caps the length", () => {
    expect(safeSymbol("A".repeat(40))).toHaveLength(12);
  });
});

describe("toReplyInput", () => {
  it("maps a scan result", () => {
    const data = {
      market: { symbol: "KILOS", liquidityUsd: 32191, marketCapUsd: 1_200_000 },
      identity: {
        mintAuthority: "REVOKED",
        freezeAuthority: "SET",
        topHolderPct: 8.44,
        lpLockedPctWeighted: null,
      },
      health: { score: 7, scoredFactors: 25, availableFactors: 28, partial: false, missingCritical: true },
    } as unknown as ScanSuccess["data"];
    const r = toReplyInput(data);
    expect(r.partial).toBe(true); // missing critical data counts as partial
    expect(r.freezeAuthority).toBe("SET");
    expect(r.lpLockedPct).toBeNull();
  });
});

describe("notFoundReply", () => {
  it("is short and plain", () => {
    expect(notFoundReply().length).toBeLessThan(280);
    expect(notFoundReply()).not.toMatch(/@|https?:/);
  });
});
