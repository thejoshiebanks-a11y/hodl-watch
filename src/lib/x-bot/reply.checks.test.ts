import { describe, it, expect } from "vitest";
import { toReplyInput } from "./reply";
import type { ScanSuccess } from "../types/scan";

describe("checks count", () => {
  it("counts observed checks out of all checks, like the app", () => {
    const data = {
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
        mintAuthority: "REVOKED",
        freezeAuthority: "REVOKED",
        topHolderPct: null,
        holderCount: null,
        insiderSupplyPct: null,
        lpLockedPctWeighted: null,
        riskFlags: null,
      },
      health: {
        score: 7,
        scoredFactors: 28,
        availableFactors: 27,
        partial: false,
        missingCritical: false,
      },
      factors: [
        { status: "AVAILABLE" },
        { status: "AVAILABLE" },
        { status: "N/A" },
      ],
    } as unknown as ScanSuccess["data"];

    const r = toReplyInput(data);
    expect(r.scored).toBe(2);
    expect(r.available).toBe(3);
  });
});
