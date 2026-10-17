import { describe, it, expect } from "vitest";
import { parseWhaleContext, whaleContextFor } from "./context";

const stored = {
  supply: 1_000_000_000,
  creator: "CREATOR",
  topHolders: ["HOLDER1"],
};

describe("parseWhaleContext", () => {
  it("accepts an object", () => {
    expect(parseWhaleContext(stored)).toEqual(stored);
  });
  it("accepts a JSON string", () => {
    expect(parseWhaleContext(JSON.stringify(stored))).toEqual(stored);
  });
  it("rejects junk", () => {
    expect(parseWhaleContext(null)).toBeNull();
    expect(parseWhaleContext("not json")).toBeNull();
    expect(parseWhaleContext({ supply: -5 })).toBeNull();
  });
  it("drops non-string holders", () => {
    const r = parseWhaleContext({ topHolders: ["A", 5, "", "B"] });
    expect(r?.topHolders).toEqual(["A", "B"]);
  });
});

describe("whaleContextFor", () => {
  it("returns nothing when there is no stored context", () => {
    expect(whaleContextFor("X", 1000, null)).toEqual({});
  });
  it("finds the creator and share of supply", () => {
    const r = whaleContextFor("CREATOR", 20_000_000, stored);
    expect(r.role).toBe("creator");
    expect(r.pctOfSupply).toBe(2);
  });
  it("treats everyone else as unknown", () => {
    expect(whaleContextFor("RANDOM", 1000, stored).role).toBe("unknown");
  });
});
