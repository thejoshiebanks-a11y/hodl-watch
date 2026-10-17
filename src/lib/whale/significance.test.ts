import { describe, it, expect } from "vitest";
import {
  assessTrade,
  type WhaleTrade,
  type TokenContext,
} from "./significance";

const ctx: TokenContext = {
  liquidityUsd: 30_000,
  supply: 1_000_000_000,
  creator: "CREATOR",
  topHolders: ["HOLDER1"],
  kolWallets: { KOL1: "Reported KOL wallet" },
};

const trade = (o: Partial<WhaleTrade>): WhaleTrade => ({
  signature: "sig",
  mint: "mint",
  wallet: "RANDOM",
  side: "sell",
  usd: 100,
  tokenAmount: 1000,
  ts: 0,
  ...o,
});

describe("assessTrade", () => {
  it("creator selling 2% of supply is critical", () => {
    const r = assessTrade(
      trade({ wallet: "CREATOR", tokenAmount: 20_000_000 }),
      ctx,
    );
    expect(r.level).toBe("critical");
    expect(r.role).toBe("creator");
  });

  it("tiny unknown sell is info", () => {
    expect(assessTrade(trade({}), ctx).level).toBe("info");
  });

  it("unknown sell of 20% of liquidity is warning", () => {
    expect(assessTrade(trade({ usd: 6000 }), ctx).level).toBe("warning");
  });

  it("labels KOL wallets", () => {
    const r = assessTrade(trade({ wallet: "KOL1", side: "buy" }), ctx);
    expect(r.role).toBe("kol");
    expect(r.label).toBe("Reported KOL wallet");
  });

  it("handles missing liquidity without crashing", () => {
    const r = assessTrade(trade({}), { ...ctx, liquidityUsd: null });
    expect(r.pctOfLiquidity).toBeNull();
  });
});
