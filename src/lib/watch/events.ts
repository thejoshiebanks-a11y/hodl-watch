import { getRedis } from "./redis";
import type { WatchEvent } from "./detect";
import type { WatchSnapshot } from "./snapshot";

export type StoredEvent = WatchEvent & {
  id: string;
  mint: string;
  symbol: string | null;
  at: string;
};

const snapKey = (mint: string) => `snap:${mint}`;
const eventsKey = (mint: string) => `events:${mint}`;
const MAX_EVENTS = 50;

export async function getSnapshot(mint: string): Promise<WatchSnapshot | null> {
  return (await getRedis().get<WatchSnapshot>(snapKey(mint))) ?? null;
}

export async function putSnapshot(s: WatchSnapshot): Promise<void> {
  await getRedis().set(snapKey(s.mint), s);
}

export async function pushEvents(
  mint: string,
  symbol: string | null,
  at: string,
  events: WatchEvent[],
): Promise<StoredEvent[]> {
  if (events.length === 0) return [];
  const stored: StoredEvent[] = events.map((e, i) => ({
    ...e,
    id: e.key ? `${at}-${e.key}` : `${at}-${i}-${e.kind}`,
    mint,
    symbol,
    at,
  }));
  const redis = getRedis();
  await redis.lpush(eventsKey(mint), ...stored);
  await redis.ltrim(eventsKey(mint), 0, MAX_EVENTS - 1);
  return stored;
}

export async function recentEvents(
  mint: string,
  n = 20,
): Promise<StoredEvent[]> {
  return getRedis().lrange<StoredEvent>(eventsKey(mint), 0, n - 1);
}
