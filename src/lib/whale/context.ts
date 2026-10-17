import { classifyWallet } from "./significance";
import type { WhaleContext } from "./logic";

export type StoredWhaleContext = {
  supply: number | null;
  creator: string | null;
  topHolders: string[];
};

/** Reads whatever Redis returns (object or JSON string); null if unusable. */
export function parseWhaleContext(raw: unknown): StoredWhaleContext | null {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (typeof v !== "object" || v === null) return null;
  const o = v as { supply?: unknown; creator?: unknown; topHolders?: unknown };

  const supply =
    typeof o.supply === "number" && Number.isFinite(o.supply) && o.supply > 0
      ? o.supply
      : null;
  const creator =
    typeof o.creator === "string" && o.creator.length > 0 ? o.creator : null;
  const topHolders = Array.isArray(o.topHolders)
    ? o.topHolders
        .filter((x): x is string => typeof x === "string" && x.length > 0)
        .slice(0, 50)
    : [];

  if (supply === null && creator === null && topHolders.length === 0) {
    return null;
  }
  return { supply, creator, topHolders };
}

/** Works out the trader's role and share of supply for one swap. */
export function whaleContextFor(
  wallet: string,
  tokens: number,
  stored: StoredWhaleContext | null,
): WhaleContext {
  if (!stored) return {};
  const { role } = classifyWallet(wallet, {
    liquidityUsd: null,
    supply: stored.supply,
    creator: stored.creator,
    topHolders: stored.topHolders,
  });
  const rawPct =
    stored.supply && Number.isFinite(tokens)
      ? (tokens / stored.supply) * 100
      : null;
  // A trade can't exceed the whole supply; if it seems to, the supply units
  // are off, so say nothing instead of a wrong number.
  const pctOfSupply = rawPct !== null && rawPct <= 100 ? rawPct : null;
  return { role, pctOfSupply };
}
