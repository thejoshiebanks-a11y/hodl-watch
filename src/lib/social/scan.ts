// Checks X for posts from tracked accounts about watched tokens, then stores
// each one as an event and pushes it, the same way whale alerts work.
import { getRedis } from "@/lib/watch/redis";
import type { WatchEvent } from "@/lib/watch/detect";
import type { WatchSnapshot } from "@/lib/watch/snapshot";
import { pushEvents } from "@/lib/watch/events";
import { notifyWatchers } from "@/lib/push/notify";
import { TRACKED_ACCOUNTS } from "./accounts";
import {
  XApiError,
  buildQueries,
  classifyPost,
  isFresh,
  searchRecent,
  type TrackedToken,
  type XPost,
} from "./x";

const THROTTLE_SECONDS = 240; // at most one check every 4 minutes
const FIRST_WINDOW_MS = 15 * 60_000; // how far back the very first check looks
const MAX_POST_AGE_MS = 60 * 60_000; // older posts never alert
export const MAX_POSTS_PER_DAY = 30; // spending cap: $0.15 a day at $0.005 per post
const MIN_REQUEST = 10; // X returns at least 10 per search, so stop when less than that is left
const ACCOUNT_COOLDOWN_SECONDS = 30 * 60; // same account + same token: once per 30 minutes
const MAX_TOKENS = 200;

export type XScanResult = {
  ok: boolean;
  reason?: string;
  queries?: number;
  posts?: number;
  events?: number;
};

const newer = (a: string, b: string) => (a.length !== b.length ? a.length > b.length : a > b);

function eventFor(level: "verified" | "possible", post: XPost, symbol: string | null, url: string): WatchEvent {
  const who = post.username ? `@${post.username}` : "A tracked account";
  const tag = symbol ? `$${symbol}` : "this token";
  const snippet = post.text.replace(/\s+/g, " ").trim().slice(0, 160);
  if (level === "verified") {
    return {
      kind: "X_POST",
      severity: "info",
      title: `${who} posted about this token`,
      detail: `The post includes this token's contract address: “${snippet}”`,
      url,
      key: `x${post.id}`,
    };
  }
  return {
    kind: "X_POST_POSSIBLE",
    severity: "info",
    title: `${who} posted ${tag} (unconfirmed)`,
    detail: `The post uses the ${tag} tag but not the contract address. Symbols are not unique, so it may be a different token. “${snippet}”`,
    url,
    key: `x${post.id}`,
  };
}

export async function scanXPosts(deadlineAt: number): Promise<XScanResult> {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return { ok: false, reason: "no_token" };
  if (TRACKED_ACCOUNTS.length === 0) return { ok: false, reason: "no_accounts" };

  const redis = getRedis();
  const first = await redis.set("x:throttle", 1, { nx: true, ex: THROTTLE_SECONDS });
  if (!first) return { ok: true, reason: "throttled" };

  const mints = (await redis.smembers("watched:mints")).slice(0, MAX_TOKENS);
  if (mints.length === 0) return { ok: true, reason: "nothing_watched" };

  const dayKey = `x:reads:${new Date().toISOString().slice(0, 10)}`;
  let used = Number((await redis.get(dayKey)) ?? 0);
  if (MAX_POSTS_PER_DAY - used < MIN_REQUEST) return { ok: true, reason: "daily_cap" };

  const snaps = await redis.mget<(WatchSnapshot | null)[]>(...mints.map((m) => `snap:${m}`));
  const tokens: TrackedToken[] = mints.map((mint, i) => ({ mint, symbol: snaps[i]?.symbol ?? null }));

  // Post ids are too big for a JS number and Redis may turn digits into one, so keep an "s" prefix.
  const stored = await redis.get<string>("x:since");
  const sinceId = typeof stored === "string" && stored.startsWith("s") ? stored.slice(1) : null;
  const startTime = new Date(Date.now() - FIRST_WINDOW_MS).toISOString();

  let cashtags = !(await redis.get("x:nocash"));
  let queries = buildQueries(TRACKED_ACCOUNTS, tokens, { cashtags });
  const posts = new Map<string, XPost>();
  let newest: string | null = null;
  let failed: string | null = null;
  let i = 0;

  while (i < queries.length && Date.now() < deadlineAt && MAX_POSTS_PER_DAY - used >= MIN_REQUEST) {
    try {
      const res = await searchRecent(queries[i], {
        bearer,
        sinceId,
        startTime: sinceId ? undefined : startTime,
        maxResults: MAX_POSTS_PER_DAY - used,
      });
      for (const p of res.posts) {
        posts.set(p.id, p);
        if (!newest || newer(p.id, newest)) newest = p.id;
      }
      if (res.newestId && (!newest || newer(res.newestId, newest))) newest = res.newestId;
      if (res.posts.length > 0) {
        used = await redis.incrby(dayKey, res.posts.length);
        await redis.expire(dayKey, 172_800);
      }
      i++;
    } catch (e) {
      if (e instanceof XApiError && e.status === 400 && cashtags) {
        // X rejected the $symbol search on this account, so fall back to contract addresses only.
        cashtags = false;
        await redis.set("x:nocash", 1, { ex: 86_400 });
        queries = buildQueries(TRACKED_ACCOUNTS, tokens, { cashtags });
        posts.clear();
        newest = null;
        i = 0;
        continue;
      }
      failed = e instanceof XApiError ? `x_${e.status}` : "error";
      break;
    }
  }

  const now = Date.now();
  let events = 0;
  const ordered = [...posts.values()].sort((a, b) => (a.id === b.id ? 0 : newer(a.id, b.id) ? 1 : -1));
  for (const post of ordered) {
    if (!isFresh(post, now, MAX_POST_AGE_MS)) continue;
    for (const m of classifyPost(post, tokens)) {
      const unseen = await redis.set(`x:seen:${post.id}:${m.mint}`, 1, { nx: true, ex: 7 * 86_400 });
      if (!unseen) continue;
      const who = (post.username ?? post.authorId ?? "unknown").toLowerCase();
      const open = await redis.set(`x:cd:${who}:${m.mint}`, 1, { nx: true, ex: ACCOUNT_COOLDOWN_SECONDS });
      if (!open) continue;

      const event = eventFor(m.level, post, m.symbol, m.url);
      await pushEvents(m.mint, m.symbol, post.createdAt, [event]);
      events++;
      try {
        await notifyWatchers(m.mint, m.symbol, [event]);
      } catch (e) {
        console.error("x scan: notify failed for", m.mint, e);
      }
    }
  }

  // Only move the marker forward after a clean run, so an error never skips posts.
  if (!failed && newest) await redis.set("x:since", `s${newest}`, { ex: 6 * 86_400 });

  return { ok: !failed, reason: failed ?? undefined, queries: queries.length, posts: posts.size, events };
}
