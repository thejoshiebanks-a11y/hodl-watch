import { getRedis } from "./redis";

export type Peak = {
  priceUsd: number | null;
  liquidityUsd: number | null;
  at: string;
};

const key = (mint: string) => `peak:${mint}`;
const TTL_SECONDS = 30 * 24 * 3600;
// One scan can lift a recorded peak by at most this factor, so a bad data
// glitch cannot create a fake peak that makes a healthy token look crashed.
const MAX_STEP = 10;

const ok = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

function higher(prev: number | null, next: number | null): number | null {
  if (!ok(next)) return ok(prev) ? prev : null;
  if (!ok(prev)) return next;
  return next > prev ? Math.min(next, prev * MAX_STEP) : prev;
}

export function mergePeak(
  prev: Peak | null,
  priceUsd: number | null,
  liquidityUsd: number | null,
  at: string,
): Peak {
  return {
    priceUsd: higher(prev?.priceUsd ?? null, priceUsd),
    liquidityUsd: higher(prev?.liquidityUsd ?? null, liquidityUsd),
    at,
  };
}

// Storage trouble must never break a scan, so reads fall back to "no peak".
export async function getPeak(mint: string): Promise<Peak | null> {
  try {
    return (await getRedis().get<Peak>(key(mint))) ?? null;
  } catch {
    return null;
  }
}

export async function updatePeak(
  mint: string,
  priceUsd: number | null,
  liquidityUsd: number | null,
  at: string,
): Promise<void> {
  try {
    const prev = await getPeak(mint);
    const next = mergePeak(prev, priceUsd, liquidityUsd, at);
    if (
      next.priceUsd === (prev?.priceUsd ?? null) &&
      next.liquidityUsd === (prev?.liquidityUsd ?? null) &&
      prev
    ) {
      return;
    }
    await getRedis().set(key(mint), next, { ex: TTL_SECONDS });
  } catch (e) {
    console.error("peak update failed for", mint, e);
  }
}
