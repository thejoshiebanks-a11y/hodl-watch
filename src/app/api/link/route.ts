import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/watch/redis";
import { rateLimit } from "@/lib/rate-limit";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I
const TTL_SECONDS = 600;
const codeKey = (c: string) => `link:${c}`;

function newCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** Make a one-time code for the device that already has the watchlist. */
export async function POST(request: Request) {
  const id = request.headers.get("x-device-id") ?? "";
  if (!DEVICE_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "invalid_device" }, { status: 400 });
  }
  const limit = await rateLimit(request, "link-new", 10, 600);
  if (!limit.ok) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }
  try {
    const redis = getRedis();
    for (let i = 0; i < 5; i++) {
      const code = newCode();
      const ok = await redis.set(codeKey(code), id, { nx: true, ex: TTL_SECONDS });
      if (ok) return NextResponse.json({ code, expiresIn: TTL_SECONDS });
    }
    return NextResponse.json({ error: "try_again" }, { status: 503 });
  } catch (e) {
    console.error("link create failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}

/** Trade a code for the shared device ID. A code works once. */
export async function PUT(request: Request) {
  const limit = await rateLimit(request, "link-join", 8, 600);
  if (!limit.ok) {
    return NextResponse.json({ error: "too_many" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (!/^[A-Z2-9]{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  try {
    const id = await getRedis().getdel<string>(codeKey(code));
    if (typeof id !== "string" || !DEVICE_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    }
    return NextResponse.json({ device: id });
  } catch (e) {
    console.error("link join failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
