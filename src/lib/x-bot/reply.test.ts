import { describe, it, expect } from "vitest";
import {
  formatReply,
  safeSymbol,
  safeFlag,
  verdict,
  reportUrl,
  xLength,
  toReplyInput,
  notFoundReply,
  type ReplyInput,
} from "./reply";
import type { ScanSuccess } from "../types/scan";

const MINT = "So11111111111111111111111111111111111111112";

const base: ReplyInput = {
  symbol: "KILOS",
  score: 6.8,
  scored: 25,
  available: 28,
  partial: false,
  liquidityUsd: 32191,
  marketCapUsd: 1_200_000,
  ageHours: 72,
  mintAuthority: "REVOKED",
  freezeAuthority: "REVOKED",
  lpLockedPct: 0,
  topHolderPct: 8.44,
  holderCount: 1234,
  insiderSupplyPct: 3.1,
  change24hPct: -12.4,
  volume24hUsd: 73600,
  buys24h: 410,
  sells24h: 380,
  flags: ["Low Liquidity", "Creator holds 5"],
  cap: null,
};

describe("verdict", () => {
  it("matches the app thresholds", () => {
    expect(verdict(7.5)).toBe("HEALTHY");
    expect(verdict(7.49)).toBe("MIXED");
    expect(verdict(5.5)).toBe("MIXED");
    expect(verdict(5.49)).toBe("WEAK");
    expect(verdict(3.5)).toBe("WEAK");
    expect(verdict(3.49)).toBe("POOR");
    expect(verdict(null)).toBeNull();
  });
});

describe("formatReply", () => {
  it("writes the full reply", () => {
    expect(formatReply(base)).toBe(
      [
        "$KILOS Health 6.8/10 MIXED (25/28 checks)",
        "Liq $32.2K · MC $1.2M · Age 3d",
        "Mint revoked · Freeze revoked · LP locked 0.0%",
        "Top holder 8.4% · Holders 1.2K · Insiders 3.1%",
        "Flags: Low Liquidity, Creator holds 5",
        "24h -12% · Vol $73.6K · Buys/Sells 410/380",
        "Not financial advice.",
      ].join("\n"),
    );
  });

  it("flags partial data and shows N/A instead of guessing", () => {
    const t = formatReply({
      ...base,
      partial: true,
      score: null,
      liquidityUsd: null,
      mintAuthority: "UNKNOWN",
      topHolderPct: null,
      flags: [],
    });
    expect(t).toContain("Health N/A (25/28 checks, partial data)");
    expect(t).toContain("Liq N/A");
    expect(t).toContain("Mint N/A");
    expect(t).toContain("Top holder N/A");
    expect(t).not.toContain("Flags:");
  });

  it("never exceeds the limit and keeps the key lines", () => {
    const t = formatReply(base, { maxLen: 120 });
    expect(xLength(t)).toBeLessThanOrEqual(120);
    expect(t).toContain("$KILOS Health 6.8/10 MIXED");
    expect(t).toContain("Liq $32.2K");
    expect(t.endsWith("Not financial advice.")).toBe(true);
  });

  it("has no links or mentions even for hostile names", () => {
    const t = formatReply({
      ...base,
      symbol: "@elonmusk https://evil.com",
      flags: [safeFlag("see evil.com/x @bob")],
    });
    expect(t).not.toMatch(/@|https?:|[A-Za-z]\.[A-Za-z]/);
    expect(t).not.toContain("evil.com");
  });

  it("adds the link when asked and still fits", () => {
    const link = reportUrl(MINT, "https://hodlterminal.vercel.app")!;
    const t = formatReply(base, { link });
    expect(t).toContain(`Full report: ${link}`);
    expect(xLength(t)).toBeLessThanOrEqual(280);
    expect(t).toContain("Flags:");
    expect(t.endsWith("Not financial advice.")).toBe(true);
  });

  it("has no link by default", () => {
    expect(formatReply(base)).not.toContain("http");
  });
});

describe("reportUrl / xLength", () => {
  it("builds the app link and refuses junk", () => {
    expect(reportUrl(MINT, "https://hodlterminal.vercel.app/")).toBe(
      `https://hodlterminal.vercel.app/t/${MINT}`,
    );
    expect(reportUrl("nope", "https://hodlterminal.vercel.app")).toBeNull();
    expect(reportUrl(MINT, "http://insecure.example")).toBeNull();
  });
  it("counts a link as 23 characters", () => {
    expect(xLength("a https://hodlterminal.vercel.app/t/abc b")).toBe(2 + 23 + 2);
  });
});

describe("safeSymbol / safeFlag", () => {
  it("strips unsafe characters", () => {
    expect(safeSymbol("scam.com")).toBe("scamcom");
    expect(safeSymbol("@bob")).toBe("bob");
    expect(safeSymbol("🔥🔥")).toBeNull();
    expect(safeSymbol("A".repeat(40))).toHaveLength(12);
    expect(safeFlag("Low Liquidity")).toBe("Low Liquidity");
    expect(safeFlag("evil.com/x")).toBe("evilcomx");
  });
});

describe("toReplyInput", () => {
  it("maps a scan result", () => {
    const data = {
      market: {
        symbol: "KILOS",
        liquidityUsd: 32191,
        marketCapUsd: 1_200_000,
        pairCreatedAt: "2026-10-15T00:00:00.000Z",
        observedAt: "2026-10-18T00:00:00.000Z",
        periods: { h24: { priceChangePct: -12.4, volumeUsd: 73600, buys: 410, sells: 380 } },
      },
      identity: {
        mintAuthority: "REVOKED",
        freezeAuthority: "SET",
        topHolderPct: 8.44,
        holderCount: 1234,
        insiderSupplyPct: 3.1,
        lpLockedPctWeighted: null,
        riskFlags: [
          { name: "Has a website", level: "info" },
          { name: "Mutable metadata", level: "warn" },
          { name: "Low Liquidity", level: "danger" },
        ],
      },
      health: { score: 6.8, scoredFactors: 25, availableFactors: 28, partial: false, missingCritical: true },
    } as unknown as ScanSuccess["data"];

    const r = toReplyInput(data);
    expect(r.ageHours).toBe(72);
    expect(r.partial).toBe(true);
    expect(r.freezeAuthority).toBe("SET");
    expect(r.lpLockedPct).toBeNull();
    expect(r.flags).toEqual(["Low Liquidity", "Mutable metadata"]);
    expect(r.buys24h).toBe(410);
  });
});

describe("notFoundReply", () => {
  it("is short and plain", () => {
    expect(notFoundReply().length).toBeLessThan(280);
    expect(notFoundReply()).not.toMatch(/@|https?:/);
  });
});
