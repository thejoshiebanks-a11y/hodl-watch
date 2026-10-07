import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getRedis } from "@/lib/watch/redis";
import { getSnapshot, pushEvents } from "@/lib/watch/events";
import { notifyWatchers } from "@/lib/push/notify";
import { parseSwaps } from "@/lib/whale/parse";
import { whaleEvent } from "@/lib/whale/logic";

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
  const watched = new Set(await redis.smembers("watched:mints"));
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

      const e = whaleEvent(
        { side: s.side, usd: s.tokens * snap.priceUsd, wallet: s.wallet },
        snap.liquidityUsd ?? null,
      );
      if (!e) continue;

      await pushEvents(s.mint, snap.symbol, s.at, [e]);
      events++;
      try {
        await notifyWatchers(s.mint, snap.symbol, [e]);
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
