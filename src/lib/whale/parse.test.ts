import { describe, expect, it } from "vitest";
import { parseSwaps } from "./parse";

const MINT = "MintAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const OTHER = "MintBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const W = "Wallet1111111111111111111111111111111111111";
const watched = new Set([MINT]);

const tx = (transfers: object[], extra: object = {}) => ({
  signature: "sig1",
  timestamp: 1_790_000_000,
  feePayer: W,
  tokenTransfers: transfers,
  ...extra,
});

describe("parseSwaps", () => {
  it("reads a buy", () => {
    const r = parseSwaps(
      [tx([{ fromUserAccount: "Pool", toUserAccount: W, mint: MINT, tokenAmount: 500 }])],
      watched,
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ side: "buy", tokens: 500, wallet: W, mint: MINT });
  });

  it("reads a sell", () => {
    const r = parseSwaps(
      [tx([{ fromUserAccount: W, toUserAccount: "Pool", mint: MINT, tokenAmount: 300 }])],
      watched,
    );
    expect(r[0]).toMatchObject({ side: "sell", tokens: 300 });
  });

  it("nets out hops through a router", () => {
    const r = parseSwaps(
      [
        tx([
          { fromUserAccount: "Pool", toUserAccount: W, mint: MINT, tokenAmount: 1000 },
          { fromUserAccount: W, toUserAccount: "Router", mint: MINT, tokenAmount: 400 },
        ]),
      ],
      watched,
    );
    expect(r[0]).toMatchObject({ side: "buy", tokens: 600 });
  });

  it("ignores unwatched mints, wallets not involved and bad input", () => {
    expect(
      parseSwaps(
        [tx([{ fromUserAccount: "Pool", toUserAccount: W, mint: OTHER, tokenAmount: 5 }])],
        watched,
      ),
    ).toEqual([]);
    expect(
      parseSwaps(
        [tx([{ fromUserAccount: "A", toUserAccount: "B", mint: MINT, tokenAmount: 5 }])],
        watched,
      ),
    ).toEqual([]);
    expect(parseSwaps("nope", watched)).toEqual([]);
    expect(parseSwaps([{ signature: 1 }, null], watched)).toEqual([]);
  });

  it("gives the same trade the same time every time", () => {
    const t = tx([{ fromUserAccount: "Pool", toUserAccount: W, mint: MINT, tokenAmount: 1 }]);
    expect(parseSwaps([t], watched)[0].at).toBe(parseSwaps([t], watched)[0].at);
  });
});
