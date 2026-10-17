import { getRedis } from "@/lib/watch/redis";
import { parseWhaleContext, type StoredWhaleContext } from "./context";

const key = (mint: string) => `whale:ctx:${mint}`;
const TTL_SECONDS = 6 * 3600;

export async function loadWhaleContext(
  mint: string,
): Promise<StoredWhaleContext | null> {
  try {
    return parseWhaleContext(await getRedis().get(key(mint)));
  } catch {
    return null; // a Redis hiccup must never break alerts
  }
}

export async function saveWhaleContext(
  mint: string,
  ctx: StoredWhaleContext,
): Promise<void> {
  await getRedis().set(key(mint), JSON.stringify(ctx), { ex: TTL_SECONDS });
}
