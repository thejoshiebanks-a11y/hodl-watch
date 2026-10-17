import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getRedis } from "@/lib/watch/redis";
import { getSnapshot, pushEvents } from "@/lib/watch/events";
import { notifyWatchers } from "@/lib/push/notify";
import type { WatchEvent } from "@/lib/watch/detect";
import { parseSwaps } from "@/lib/whale/parse";
import { whaleEvent, MIN_WHALE_USD } from "@/lib/whale/logic";
import { whaleContextFor } from "@/lib/whale/context";
import { loadWhaleContext } from "@/lib/whale/context-store";
import { trackCluster } from "@/lib/whale/trades-store";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MAX_SWAPS_PER_CALL = 200;

function authorized(request: Request): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (!secret) return false;
  const got = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const redis = getRedis();
  let watched: Set<string>;
  try {
    watched = new Set(await redis.smembers("watched:mints"));
  } catch (err) {
    // Answer 200 so Helius doesn't retry while storage is down.
    console.error("helius webhook: storage unavailable", err);
    return NextResponse.json({ received: 0, swaps: 0, events: 0, error: "storage_unavailable" });
  }
  const swaps = parseSwaps(body, watched).slice(0, MAX_SWAPS_PER_CALL);

  let events = 0;
  for (const s of swaps) {
    try {
      // Helius can deliver the same transaction twice.
      const fresh = await redis.set(`whale:seen:${s.signature}:${s.mint}`, 1, {
        nx: true,
        ex: 3600,
      });
      if (!fresh) continue;

      const snap = await getSnapshot(s.mint);
      if (!snap || typeof snap.priceUsd !== "number") continue;

      const usd = s.tokens * snap.priceUsd;
      if (!(usd >= MIN_WHALE_USD)) continue; // small trades never need more Redis calls
      const liquidity = snap.liquidityUsd ?? null;
      const stored = await loadWhaleContext(s.mint);

      const found: WatchEvent[] = [];
      const e = whaleEvent(
        { side: s.side, usd, wallet: s.wallet, signature: s.signature },
        liquidity,
        whaleContextFor(s.wallet, s.tokens, stored),
      );
      if (e) found.push(e);

      const cluster = await trackCluster(
        s.mint,
        { side: s.side, usd, wallet: s.wallet, at: Date.parse(s.at) },
        liquidity,
      );
      if (cluster) found.push(cluster);
      if (found.length === 0) continue;

      await pushEvents(s.mint, snap.symbol, s.at, found);
      events += found.length;
      try {
        await notifyWatchers(s.mint, snap.symbol, found);
      } catch (err) {
        console.error("helius webhook: notify failed for", s.mint, err);
      }
    } catch (err) {
      console.error("helius webhook: swap failed", s.signature, err);
    }
  }

  return NextResponse.json({
    received: Array.isArray(body) ? body.length : 0,
    swaps: swaps.length,
    events,
  });
}
