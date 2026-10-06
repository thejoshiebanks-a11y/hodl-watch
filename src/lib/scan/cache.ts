import { getRedis } from "@/lib/watch/redis";
import { runScan, type ScanOutcome } from "./run";

const TTL_SECONDS = 20;
const key = (mint: string) => `scancache:${mint}`;

export async function getScanCached(mint: string): Promise<ScanOutcome> {
  try {
    const hit = await getRedis().get<ScanOutcome>(key(mint));
    if (hit && hit.ok) return hit;
  } catch {
    // Cache trouble must never block a scan.
  }

  const outcome = await runScan(mint);

  if (outcome.ok) {
    try {
      await getRedis().set(key(mint), outcome, { ex: TTL_SECONDS });
    } catch {
      // ignore
    }
  }
  return outcome;
}
