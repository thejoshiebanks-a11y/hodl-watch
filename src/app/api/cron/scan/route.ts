import { NextResponse } from "next/server";
import { getRedis } from "@/lib/watch/redis";
import { runScan } from "@/lib/scan/run";
import { toSnapshot } from "@/lib/watch/snapshot";
import { detectEvents } from "@/lib/watch/detect";
import { getSnapshot, putSnapshot, pushEvents } from "@/lib/watch/events";
import type { WatchEntry } from "@/lib/watch/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_MINTS_PER_RUN = 40;
const CONCURRENCY = 4;
const DEADLINE_MS = 50_000;

type Result = { mint: string; status: string; events: number };

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function processMint(mint: string): Promise<Result> {
  const redis = getRedis();

  const outcome = await runScan(mint);
  if (!outcome.ok) return { mint, status: "not_found", events: 0 };

  const curr = toSnapshot(outcome.data);
  const prev = await getSnapshot(mint);
  const found = prev ? detectEvents(prev, curr) : [];

  await pushEvents(mint, curr.symbol, curr.at, found);
  await putSnapshot(curr);

  // Keep every watcher's saved Health fresh.
  const devices = await redis.smembers(`watchers:${mint}`);
  for (const device of devices) {
    const entry = await redis.hget<WatchEntry>(`watch:${device}`, mint);
    if (!entry) continue;
    await redis.hset(`watch:${device}`, {
      [mint]: {
        ...entry,
        lastHealth: curr.health ?? entry.lastHealth,
        lastScanAt: curr.at,
      },
    });
  }

  return { mint, status: "ok", events: found.length };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  let mints: string[];
  try {
    mints = await getRedis().smembers("watched:mints");
  } catch (e) {
    console.error("cron: storage unavailable", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  mints = mints.sort(() => Math.random() - 0.5).slice(0, MAX_MINTS_PER_RUN);

  const results: Result[] = [];
  let next = 0;

  async function worker() {
    while (next < mints.length && Date.now() - started < DEADLINE_MS) {
      const mint = mints[next++];
      try {
        results.push(await processMint(mint));
      } catch (e) {
        console.error("cron: scan failed for", mint, e);
        results.push({ mint, status: "error", events: 0 });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return NextResponse.json({
    scanned: results.length,
    watched: mints.length,
    events: results.reduce((n, r) => n + r.events, 0),
    ms: Date.now() - started,
    results,
  });
}
