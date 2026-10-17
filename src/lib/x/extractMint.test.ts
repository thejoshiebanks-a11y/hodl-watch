import { describe, it, expect } from "vitest";
import { extractMints } from "./extractMint";

const MINT = "So11111111111111111111111111111111111111112";

describe("extractMints", () => {
  it("finds a mint in plain text", () => {
    expect(extractMints(`@HODLbot scan ${MINT}`)).toEqual([MINT]);
  });

  it("finds a mint inside a dexscreener-style URL", () => {
    expect(extractMints(`https://dexscreener.com/solana/${MINT}`)).toEqual([
      MINT,
    ]);
  });

  it("dedupes and ignores normal words and handles", () => {
    expect(extractMints(`@HODLbot ${MINT} ${MINT} gm frens`)).toEqual([MINT]);
  });

  it("returns empty when there is no CA", () => {
    expect(extractMints("@HODLbot scan this pls")).toEqual([]);
  });
});
