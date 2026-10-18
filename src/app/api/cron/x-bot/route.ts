import { NextResponse } from "next/server";
import { getRedis } from "@/lib/watch/redis";
import { runScan } from "@/lib/scan/run";
import { isFresh, searchRecent, XApiError, type XPost } from "@/lib/social/x";
import { parseMention } from "@/lib/x-bot/mention";
import { buildMentionQuery, compareIds, dayStamp, intEnv } from "@/lib/x-bot/query";
import { formatReply, notFoundReply, reportUrl, toReplyInput } from "@/lib/x-bot/reply";
import { isLive, loadCreds, postReply } from "@/lib/x-bot/post";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MIN_REQUEST = 10; // X returns at least 10 per search
const FIRST_WINDOW_MS = 15 * 60_000;
const MAX_POST_AGE_MS = 60 * 60_000; // never answer a mention older than an hour
const REPLY_CACHE_SECONDS = 120;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Off by default: no Redis, no X calls.
  if (process.env.X_BOT_ENABLED !== "true") {
    return NextResponse.json({ ok: true, reason: "disabled" });
  }

  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return NextResponse.json({ ok: false, reason: "no_token" });

  const handle = process.env.X_BOT_HANDLE ?? "HODLB0T";
  let query: string;
  try {
    query = buildMentionQuery(handle);
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_handle" });
  }

  const started = Date.now();
  const live = isLive();
  const creds = loadCreds();
  const maxReads = intEnv(process.env.X_BOT_MAX_READS_PER_DAY, 60, 10, 1000);
  const maxReplies = intEnv(process.env.X_BOT_MAX_REPLIES_PER_DAY, 20, 1, 500);
  const perUser = intEnv(process.env.X_BOT_MAX_PER_USER_PER_DAY, 5, 1, 50);
  const withLink = process.env.X_BOT_INCLUDE_LINK === "true";
  const site = process.env.HODL_PUBLIC_URL ?? "https://hodlterminal.vercel.app";

  const redis = getRedis();
  if (await redis.get("xbot:paused")) {
    return NextResponse.json({ ok: true, reason: "paused" });
  }
  const first = await redis.set("xbot:throttle", 1, { nx: true, ex: 120 });
  if (!first) return NextResponse.json({ ok: true, reason: "throttled" });

  const day = dayStamp();
  const readsKey = `xbot:reads:${day}`;
  const repliesKey = `xbot:replies:${day}`;
  const reads = Number((await redis.get(readsKey)) ?? 0);
  if (maxReads - reads < MIN_REQUEST) {
    return NextResponse.json({ ok: true, reason: "read_cap" });
  }

  // Post ids are too big for a JS number, so the marker keeps an "s" prefix.
  const stored = await redis.get<string>("xbot:since");
  const sinceId = typeof stored === "string" && stored.startsWith("s") ? stored.slice(1) : null;

  let posts: XPost[] = [];
  let newest: string | null = null;
  try {
    const res = await searchRecent(query, {
      bearer,
      sinceId,
      startTime: sinceId ? undefined : new Date(Date.now() - FIRST_WINDOW_MS).toISOString(),
      maxResults: Math.min(100, maxReads - reads),
    });
    posts = res.posts;
    newest = res.newestId;
    if (posts.length > 0) {
      await redis.incrby(readsKey, posts.length);
      await redis.expire(readsKey, 172_800);
    }
  } catch (e) {
    const status = e instanceof XApiError ? e.status : 0;
    if (status === 402) await redis.set("xbot:paused", 1, { ex: 3600 });
    return NextResponse.json({ ok: false, reason: status ? `x_${status}` : "error" });
  }

  for (const p of posts) if (!newest || compareIds(p.id, newest) > 0) newest = p.id;

  const stats = { posts: posts.length, replied: 0, dryRun: 0, skipped: 0, capped: 0 };
  let failed: string | null = null;
  const ordered = [...posts].sort((a, b) => compareIds(a.id, b.id));

  for (const post of ordered) {
    if (Date.now() - started > 50_000) {
      failed = "deadline";
      break;
    }
    if (!isFresh(post, Date.now(), MAX_POST_AGE_MS)) {
      stats.skipped++;
      continue;
    }
    const m = parseMention(post, handle);
    if (!m.ok) {
      stats.skipped++;
      continue;
    }

    const seenKey = `xbot:seen:${post.id}`;
    if (!(await redis.set(seenKey, 1, { nx: true, ex: 7 * 86_400 }))) continue;

    const sent = Number((await redis.get(repliesKey)) ?? 0);
    const userKey = `xbot:user:${m.userId}:${day}`;
    const count = await redis.incr(userKey);
    await redis.expire(userKey, 172_800);
    if (sent >= maxReplies || count > perUser) {
      stats.capped++;
      continue;
    }

    try {
      const cacheKey = `xbot:reply:${m.mint}:${withLink ? 1 : 0}`;
      let text = await redis.get<string>(cacheKey);
      if (!text) {
        const outcome = await runScan(m.mint);
        text = outcome.ok
          ? formatReply(toReplyInput(outcome.data), {
              link: withLink ? reportUrl(m.mint, site) : null,
            })
          : notFoundReply();
        await redis.set(cacheKey, text, { ex: REPLY_CACHE_SECONDS });
      }

      const result = await postReply({ text, inReplyTo: post.id, creds, live });
      if (!result.ok) {
        await redis.del(seenKey); // try again next run
        if (result.reason === "no_credits" || result.reason === "rate_limited") {
          await redis.set("xbot:paused", 1, { ex: result.reason === "no_credits" ? 3600 : 900 });
        }
        failed = result.reason;
        break;
      }
      if (result.dryRun) {
        stats.dryRun++;
        console.log("x-bot dry-run reply to", post.id, JSON.stringify(text));
      } else {
        stats.replied++;
        await redis.incr(repliesKey);
        await redis.expire(repliesKey, 172_800);
      }
    } catch (e) {
      console.error("x-bot: failed for", post.id, e);
      await redis.del(seenKey);
      failed = "error";
      break;
    }
  }

  // Only move the marker forward after a clean run, so an error never skips mentions.
  if (!failed && newest) await redis.set("xbot:since", `s${newest}`, { ex: 6 * 86_400 });

  return NextResponse.json({
    ok: !failed,
    reason: failed ?? undefined,
    live,
    ...stats,
    ms: Date.now() - started,
  });
}
