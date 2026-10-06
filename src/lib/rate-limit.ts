import { getRedis } from "@/lib/watch/redis";

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

// Fixed-window limiter. Fails open: if storage is down, users are not blocked.
export async function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const redis = getRedis();
    const nowSec = Math.floor(Date.now() / 1000);
    const window = Math.floor(nowSec / windowSeconds);
    const key = `rl:${bucket}:${clientIp(request)}:${window}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, windowSeconds + 5);
    if (n > limit) {
      return { ok: false, retryAfter: windowSeconds - (nowSec % windowSeconds) };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}
