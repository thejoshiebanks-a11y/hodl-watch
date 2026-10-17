import { describe, it, expect } from "vitest";
import { buildWhaleContext } from "./from-identity";
import { whaleContextFor } from "./context";

const holder = (owner: string | null, knownType: string | null = null) => ({
  address: `acct-${owner}`,
  owner,
  pct: 1,
  insider: null,
  knownType,
});

describe("buildWhaleContext", () => {
  it("collects creator, supply and holder wallets", () => {
    const r = buildWhaleContext({
      creator: "CREATOR",
      supplyUi: 1_000_000_000,
      topHolders: [holder("W1"), holder("W2")],
    });
    expect(r).toEqual({
      supply: 1_000_000_000,
      creator: "CREATOR",
      topHolders: ["W1", "W2"],
    });
  });

  it("skips pools, known accounts and holders without an owner", () => {
    const r = buildWhaleContext({
      creator: null,
      supplyUi: null,
      topHolders: [holder("POOL", "amm"), holder(null), holder("W1")],
    });
    expect(r?.topHolders).toEqual(["W1"]);
  });

  it("returns null when there is nothing useful", () => {
    expect(
      buildWhaleContext({ creator: null, supplyUi: null, topHolders: [] }),
    ).toBeNull();
  });
});

describe("supply safety net", () => {
  it("drops a share of supply over 100%", () => {
    const stored = { supply: 1000, creator: null, topHolders: [] };
    expect(whaleContextFor("X", 5000, stored).pctOfSupply).toBeNull();
  });
  it("keeps a sensible share of supply", () => {
    const stored = { supply: 1000, creator: null, topHolders: [] };
    expect(whaleContextFor("X", 50, stored).pctOfSupply).toBe(5);
  });
});
