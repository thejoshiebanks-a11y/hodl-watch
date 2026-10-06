import { NextResponse } from "next/server";
import { getRedis } from "@/lib/watch/redis";
import { runScan } from "@/lib/scan/run";
import { toSnapshot, type WatchSnapshot } from "@/lib/watch/snapshot";
import { detectEvents } from "@/lib/watch/detect";
import { putSnapshot, pushEvents } from "@/lib/watch/events";
import { notifyWatchers } from "@/lib/push/notify";
import { updatePeak } from "@/lib/watch/peaks";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_MINTS_PER_RUN = 60;
const CONCURRENCY = 5;
const DEADLINE_MS = 50_000;
const MIN_AGE_MS = 4 * 60_000;
const MISS_TTL_SECONDS = 15 * 60;

type Result = { mint: string; status: string; events: number };
type Due = { mint: string; prev: WatchSnapshot | null; age: number };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function processMint(
  mint: string,
  prev: WatchSnapshot | null,
): Promise<Result> {
  const outcome = await runScan(mint);
  if (!outcome.ok) {
    // Don't retry a token with no market for 15 minutes.
    await getRedis().set(`miss:${mint}`, 1, { ex: MISS_TTL_SECONDS });
    return { mint, status: "not_found", events: 0 };
  }

  const curr = toSnapshot(outcome.data);
  await updatePeak(mint, curr.priceUsd, curr.liquidityUsd, curr.at);
  const found = prev ? detectEvents(prev, curr) : [];

  await pushEvents(mint, curr.symbol, curr.at, found);
  await putSnapshot(curr);

  try {
    await notifyWatchers(mint, curr.symbol, found);
  } catch (e) {
    console.error("cron: notify failed for", mint, e);
  }

  return { mint, status: "ok", events: found.length };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const due: Due[] = [];
  let watched = 0;

  try {
    const redis = getRedis();
    const mints = await redis.smembers("watched:mints");
    watched = mints.length;

    if (mints.length > 0) {
      const raw = await redis.mget<unknown[]>(
        ...mints.flatMap((m) => [`snap:${m}`, `miss:${m}`]),
      );

      mints.forEach((mint, i) => {
        const prev = (raw[i * 2] as WatchSnapshot | null) ?? null;
        const missed = raw[i * 2 + 1] != null;
        if (missed) return;

        const t = prev ? Date.parse(prev.at) : NaN;
        const age = Number.isFinite(t) ? Date.now() - t : Infinity;
        if (age >= MIN_AGE_MS) due.push({ mint, prev, age });
      });
    }
  } catch (e) {
    console.error("cron: storage unavailable", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  // Stalest first, so every token gets its turn.
  due.sort((a, b) => (a.age === b.age ? 0 : b.age > a.age ? 1 : -1));
  const queue = due.slice(0, MAX_MINTS_PER_RUN);

  const results: Result[] = [];
  let next = 0;

  async function worker() {
    while (next < queue.length && Date.now() - started < DEADLINE_MS) {
      const { mint, prev } = queue[next++];
      try {
        results.push(await processMint(mint, prev));
      } catch (e) {
        console.error("cron: scan failed for", mint, e);
        results.push({ mint, status: "error", events: 0 });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return NextResponse.json({
    watched,
    due: due.length,
    scanned: results.length,
    events: results.reduce((n, r) => n + r.events, 0),
    ms: Date.now() - started,
    results,
  });
}
