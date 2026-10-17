import { getRedis } from "@/lib/watch/redis";
import type { WatchEvent } from "@/lib/watch/detect";
import { clusterEvent, CLUSTER_WINDOW_MS, type RecentTrade } from "./cluster";
import { MIN_WHALE_USD } from "./logic";

const tradesKey = (mint: string) => `whale:trades:${mint}`;

function isTrade(v: unknown): v is RecentTrade {
  if (typeof v !== "object" || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    (t.side === "buy" || t.side === "sell") &&
    typeof t.usd === "number" &&
    typeof t.wallet === "string" &&
    typeof t.at === "number"
  );
}

/**
 * Remembers this trade, then checks whether several wallets are trading the
 * same way. Fires at most once per side per window. Never throws: a Redis
 * problem must not stop normal whale alerts.
 */
export async function trackCluster(
  mint: string,
  trade: RecentTrade,
  liquidityUsd: number | null,
): Promise<WatchEvent | null> {
  try {
    if (!(trade.usd >= MIN_WHALE_USD) || !Number.isFinite(trade.at)) return null;
    const redis = getRedis();
    const key = tradesKey(mint);
    await redis.lpush(key, trade);
    await redis.ltrim(key, 0, 49);
    await redis.expire(key, 1800);

    const raw = await redis.lrange<unknown>(key, 0, 49);
    const event = clusterEvent(raw.filter(isTrade), liquidityUsd, Date.now());
    if (!event) return null;

    const first = await redis.set(`whale:cluster:sent:${mint}:${event.key}`, 1, {
      nx: true,
      ex: Math.round(CLUSTER_WINDOW_MS / 1000),
    });
    return first ? event : null;
  } catch (err) {
    console.error("whale cluster: failed for", mint, err);
    return null;
  }
}
