import { POOL_PATTERN } from "../providers/market/candles";

/** Helius bills a credit per event, so the number of pools is capped. */
export const MAX_WATCHED_POOLS = 20;

export function normalizeAddresses(
  pools: unknown[],
  max = MAX_WATCHED_POOLS,
): string[] {
  const seen = new Set<string>();
  for (const p of pools) {
    if (typeof p === "string" && POOL_PATTERN.test(p)) seen.add(p);
  }
  return [...seen].sort().slice(0, max);
}
