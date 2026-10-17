import { describe, it, expect } from "vitest";
import { clusterEvent, type RecentTrade } from "./cluster";

const NOW = 1_000_000_000;
const t = (wallet: string, usd: number, side: "buy" | "sell" = "buy", agoMs = 60_000): RecentTrade => ({
  wallet, usd, side, at: NOW - agoMs,
});

describe("clusterEvent", () => {
  it("flags 3 wallets buying together", () => {
    const e = clusterEvent([t("A", 1000), t("B", 2000), t("C", 3000)], 60_000, NOW);
    expect(e?.kind).toBe("WHALE_CLUSTER");
    expect(e?.title).toBe("3 wallets bought $6.0K in 10 min");
    expect(e?.value).toBe(10);
    expect(e?.severity).toBe("info");
  });

  it("needs three different wallets", () => {
    expect(clusterEvent([t("A", 1000), t("A", 2000), t("B", 3000)], 60_000, NOW)).toBeNull();
  });

  it("ignores trades outside the window", () => {
    const old = 11 * 60_000;
    expect(
      clusterEvent([t("A", 1000, "buy", old), t("B", 1000), t("C", 1000)], 60_000, NOW),
    ).toBeNull();
  });

  it("does not mix buys and sells", () => {
    expect(
      clusterEvent([t("A", 1000), t("B", 1000), t("C", 1000, "sell")], 60_000, NOW),
    ).toBeNull();
  });

  it("makes a big sell cluster critical", () => {
    const e = clusterEvent(
      [t("A", 4000, "sell"), t("B", 4000, "sell"), t("C", 4000, "sell")],
      50_000,
      NOW,
    );
    expect(e?.severity).toBe("critical");
  });

  it("needs liquidity", () => {
    expect(clusterEvent([t("A", 1000), t("B", 1000), t("C", 1000)], null, NOW)).toBeNull();
  });
});
