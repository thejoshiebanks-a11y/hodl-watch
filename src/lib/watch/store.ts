import { getRedis } from "./redis";
import { MAX_WATCHES_PER_DEVICE, type WatchEntry } from "./types";

const listKey = (device: string) => `watch:${device}`;
const watchersKey = (mint: string) => `watchers:${mint}`;
const ALL_MINTS = "watched:mints";

export type AddInput = Pick<
  WatchEntry,
  "mint" | "symbol" | "name" | "imageUrl"
> & { health?: number | null };

export async function listWatches(device: string): Promise<WatchEntry[]> {
  const all = await getRedis().hgetall<Record<string, WatchEntry>>(
    listKey(device),
  );
  if (!all) return [];
  return Object.values(all).sort((a, b) =>
    b.addedAt.localeCompare(a.addedAt),
  );
}

// Upsert: adds a new watch, or refreshes the saved Health of an existing one.
export async function addWatch(
  device: string,
  input: AddInput,
): Promise<{ ok: true; entry: WatchEntry } | { ok: false; reason: "limit" }> {
  const redis = getRedis();
  const now = new Date().toISOString();
  const { health = null, ...base } = input;

  const existing = await redis.hget<WatchEntry>(listKey(device), base.mint);
  if (existing) {
    const updated: WatchEntry = {
      ...existing,
      lastHealth: health ?? existing.lastHealth,
      lastScanAt: health !== null ? now : existing.lastScanAt,
    };
    await redis.hset(listKey(device), { [base.mint]: updated });
    return { ok: true, entry: updated };
  }

  const count = await redis.hlen(listKey(device));
  if (count >= MAX_WATCHES_PER_DEVICE) return { ok: false, reason: "limit" };

  const entry: WatchEntry = {
    ...base,
    addedAt: now,
    lastHealth: health,
    lastScanAt: health !== null ? now : null,
  };

  await redis.hset(listKey(device), { [base.mint]: entry });
  await redis.sadd(watchersKey(base.mint), device);
  await redis.sadd(ALL_MINTS, base.mint);
  return { ok: true, entry };
}

export async function removeWatch(device: string, mint: string) {
  const redis = getRedis();
  await redis.hdel(listKey(device), mint);
  await redis.srem(watchersKey(mint), device);
  if ((await redis.scard(watchersKey(mint))) === 0) {
    await redis.srem(ALL_MINTS, mint);
  }
}
