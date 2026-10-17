import { describe, it, expect } from "vitest";
import { whaleEvent, solscanUrl } from "./logic";

const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjyhZkp5gBxXyWNEQ3zxgnbJvMZtRDJH";

describe("solscanUrl", () => {
  it("builds a link for a real-looking signature", () => {
    expect(solscanUrl(SIG)).toBe(`https://solscan.io/tx/${SIG}`);
  });
  it("refuses junk", () => {
    expect(solscanUrl(undefined)).toBeUndefined();
    expect(solscanUrl("abc")).toBeUndefined();
    expect(solscanUrl("../../evil?x=1")).toBeUndefined();
  });
});

describe("whaleEvent link", () => {
  const swap = { side: "sell" as const, usd: 4000, wallet: "ABCDEFGHIJKLMNOP" };
  it("adds the link when a signature is given", () => {
    expect(whaleEvent({ ...swap, signature: SIG }, 30_000)?.url).toBe(
      `https://solscan.io/tx/${SIG}`,
    );
  });
  it("has no url when there is no signature", () => {
    expect(whaleEvent(swap, 30_000)?.url).toBeUndefined();
  });
});
