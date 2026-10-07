import { getRedis } from "./redis";
import type { WatchSnapshot } from "./snapshot";
import type { HistoryPoint } from "./trend";

const key = (mint: string) => `hist:${mint}`;
const MAX_POINTS = 100; // about 25 hours at one point per 15 minutes

export async function pushHistory(s: WatchSnapshot): Promise<void> {
  // Scans run every 5 minutes. Keeping one in three is plenty for trends and
  // keeps storage use small.
  const t = Date.parse(s.at);
  if (!Number.isFinite(t) || Math.floor(t / 60_000) % 15 >= 5) return;

  const point: HistoryPoint = {
    at: s.at,
    holders: s.holderCount,
    liquidityUsd: s.liquidityUsd,
    priceUsd: s.priceUsd,
  };
  const redis = getRedis();
  await redis.lpush(key(s.mint), point);
  await redis.ltrim(key(s.mint), 0, MAX_POINTS - 1);
}

/** Newest first. */
export async function readHistory(mint: string): Promise<HistoryPoint[]> {
  return getRedis().lrange<HistoryPoint>(key(mint), 0, MAX_POINTS - 1);
}
