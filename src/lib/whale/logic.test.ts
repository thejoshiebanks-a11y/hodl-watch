import { describe, expect, it } from "vitest";
import { defOf, shouldAlert } from "../watch/alert-catalog";
import { whaleEvent } from "./logic";

const wallet = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

describe("whaleEvent", () => {
  it("ignores trades under the dollar floor", () => {
    expect(whaleEvent({ side: "buy", usd: 400, wallet }, 1000)).toBeNull();
  });

  it("ignores trades that are tiny next to the pool", () => {
    expect(whaleEvent({ side: "buy", usd: 600, wallet }, 1_000_000)).toBeNull();
  });

  it("needs a known pool size", () => {
    expect(whaleEvent({ side: "buy", usd: 5000, wallet }, null)).toBeNull();
    expect(whaleEvent({ side: "buy", usd: 5000, wallet }, 0)).toBeNull();
  });

  it("flags a buy as a share of liquidity", () => {
    const e = whaleEvent({ side: "buy", usd: 1000, wallet }, 20000);
    expect(e?.kind).toBe("WHALE_BUY");
    expect(e?.value).toBe(5);
    expect(e?.severity).toBe("info");
  });

  it("grades sells by size", () => {
    expect(whaleEvent({ side: "sell", usd: 2000, wallet }, 20000)?.severity).toBe("warning");
    expect(whaleEvent({ side: "sell", usd: 5000, wallet }, 20000)?.severity).toBe("critical");
  });

  it("works on a very small pool", () => {
    expect(whaleEvent({ side: "buy", usd: 600, wallet }, 5000)?.value).toBe(12);
  });
});

describe("whale alert settings", () => {
  it("are in the catalog with a threshold", () => {
    expect(defOf("WHALE_BUY")?.threshold).toBeDefined();
    expect(defOf("WHALE_SELL")?.threshold).toBeDefined();
  });

  it("respect the user's threshold", () => {
    expect(shouldAlert("WHALE_BUY", 5, undefined)).toBe(true);
    expect(shouldAlert("WHALE_BUY", 3, undefined)).toBe(false);
    expect(shouldAlert("WHALE_BUY", 3, { WHALE_BUY: { min: 2 } })).toBe(true);
  });
});
