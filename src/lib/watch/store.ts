import { getRedis } from "./redis";
import {
  MAX_WATCHES_PER_DEVICE,
  type WatchEntry,
} from "./types";

const listKey = (device: string) => `watch:${device}`;
const watchersKey = (mint: string) => `watchers:${mint}`;
const ALL_MINTS = "watched:mints";

export async function listWatches(device: string): Promise<WatchEntry[]> {
  const all = await getRedis().hgetall<Record<string, WatchEntry>>(
    listKey(device),
  );
  if (!all) return [];
  return Object.values(all).sort((a, b) =>
    b.addedAt.localeCompare(a.addedAt),
  );
}

export async function addWatch(
  device: string,
  input: Pick<WatchEntry, "mint" | "symbol" | "name" | "imageUrl">,
): Promise<{ ok: true; entry: WatchEntry } | { ok: false; reason: "limit" }> {
  const redis = getRedis();
  const existing = await redis.hget<WatchEntry>(listKey(device), input.mint);
  if (existing) return { ok: true, entry: existing };

  const count = await redis.hlen(listKey(device));
  if (count >= MAX_WATCHES_PER_DEVICE) return { ok: false, reason: "limit" };

  const entry: WatchEntry = {
    ...input,
    addedAt: new Date().toISOString(),
    lastHealth: null,
    lastScanAt: null,
  };

  await redis.hset(listKey(device), { [input.mint]: entry });
  await redis.sadd(watchersKey(input.mint), device);
  await redis.sadd(ALL_MINTS, input.mint);
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
