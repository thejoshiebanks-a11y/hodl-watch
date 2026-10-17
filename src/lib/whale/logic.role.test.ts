import { describe, it, expect } from "vitest";
import { whaleEvent } from "./logic";

const sell = { side: "sell" as const, usd: 4000, wallet: "ABCDEFGHIJKLMNOP" };

describe("whaleEvent with wallet context", () => {
  it("a creator sell of 13% of liquidity is critical", () => {
    const e = whaleEvent(sell, 30_000, { role: "creator" });
    expect(e?.severity).toBe("critical");
    expect(e?.title).toBe("Creator wallet sold $4.0K");
  });

  it("the same sell from an unknown wallet is only a warning", () => {
    const e = whaleEvent(sell, 30_000);
    expect(e?.severity).toBe("warning");
    expect(e?.title).toBe("Whale sold $4.0K");
  });

  it("shows share of supply when it is meaningful", () => {
    const e = whaleEvent(sell, 30_000, { role: "top_holder", pctOfSupply: 1.5 });
    expect(e?.detail).toContain("1.5% of supply");
  });

  it("labels a reported KOL buy as info", () => {
    const e = whaleEvent({ ...sell, side: "buy" }, 30_000, { role: "kol" });
    expect(e?.severity).toBe("info");
    expect(e?.title).toBe("Reported KOL wallet bought $4.0K");
  });
});
