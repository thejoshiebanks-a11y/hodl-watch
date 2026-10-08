// "Posted CA": did the token's own linked X account post its contract address?
import { getRedis } from "@/lib/watch/redis";
import { MAX_POSTS_PER_DAY } from "./scan";
import type { WatchEvent } from "@/lib/watch/detect";
import { decidePosted, findPost, xHandleFrom, type PostedCa } from "./posted-match";
import { postUrl, searchRecent } from "./x";

const MIN_REQUEST = 10; // same rule as the alert scan: X returns up to 10 per search
const TTL_FOUND = 24 * 3600;
const TTL_NOT_SEEN = 10 * 60;
const TTL_ERROR = 2 * 60;

export async function checkPostedCa(
  mint: string,
  socials: { handle?: string | null }[],
): Promise<PostedCa> {
  const handle = xHandleFrom(socials);
  if (!handle) return { state: "UNKNOWN", reason: "no_x_account" };

  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return { state: "UNKNOWN", reason: "no_token", handle };

  const redis = getRedis();
  const cacheKey = `posted:${mint}:${handle.toLowerCase()}`;
  const cached = await redis.get<PostedCa>(cacheKey);
  if (cached && typeof cached === "object" && "state" in cached) return cached;

  // Lookups spend from the same daily budget as the alert scan.
  const dayKey = `x:reads:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await redis.get(dayKey)) ?? 0);
  if (MAX_POSTS_PER_DAY - used < MIN_REQUEST) {
    return { state: "UNKNOWN", reason: "budget", handle };
  }

  try {
    const res = await searchRecent(`from:${handle} ${mint} -is:retweet`, {
      bearer,
      maxResults: MIN_REQUEST,
    });
    if (res.posts.length > 0) {
      await redis.incrby(dayKey, res.posts.length);
      await redis.expire(dayKey, 172_800);
    }
    const hit = findPost(res.posts, handle, mint);
    const result: PostedCa = hit
      ? { state: "YES", handle, url: postUrl(hit) }
      : { state: "NOT_SEEN", handle };
    await redis.set(cacheKey, result, { ex: hit ? TTL_FOUND : TTL_NOT_SEEN });
    return result;
  } catch (e) {
    console.error("posted-ca lookup failed:", e);
    const result: PostedCa = { state: "UNKNOWN", reason: "x_error", handle };
    await redis.set(cacheKey, result, { ex: TTL_ERROR }).catch(() => undefined);
    return result;
  }
}

/** A CA_POSTED event when the token's own account has just posted its address. */
export async function detectPostedCa(
  mint: string,
  socials: { handle?: string | null }[],
): Promise<WatchEvent | null> {
  const r = await checkPostedCa(mint, socials);
  if (r.state === "UNKNOWN") return null;

  const redis = getRedis();
  const key = `postedca:base:${mint}`;
  const raw = await redis.get<string>(key);
  const base = raw === "YES" || raw === "NOT_SEEN" ? raw : null;
  const d = decidePosted(base, r.state);
  if (d.base && d.base !== base) await redis.set(key, d.base, { ex: 30 * 86_400 });
  if (!d.fire || r.state !== "YES") return null;

  return {
    kind: "CA_POSTED",
    severity: "info",
    title: `@${r.handle} posted the contract address`,
    detail: "The token's own linked X account posted this token's address.",
    url: r.url,
    key: "ca-posted",
  };
}
