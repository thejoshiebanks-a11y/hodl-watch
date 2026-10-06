import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeRules } from "@/lib/watch/alert-catalog";
import { getTokenRules, putTokenRules } from "@/lib/watch/settings";
import { getRedis } from "@/lib/watch/redis";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  mint: SolanaMintSchema,
  rules: z.record(z.string(), z.unknown()),
});

function device(request: Request): string | null {
  const id = request.headers.get("x-device-id") ?? "";
  return DEVICE_ID_PATTERN.test(id) ? id : null;
}

export async function GET(request: Request) {
  const id = device(request);
  if (!id) return NextResponse.json({ error: "invalid_device" }, { status: 400 });

  const mint = SolanaMintSchema.safeParse(new URL(request.url).searchParams.get("mint"));
  if (!mint.success) return NextResponse.json({ error: "invalid_mint" }, { status: 400 });

  try {
    return NextResponse.json({ rules: await getTokenRules(id, mint.data) });
  } catch (e) {
    console.error("token settings read failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const id = device(request);
  if (!id) return NextResponse.json({ error: "invalid_device" }, { status: 400 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    // Only tokens this device actually watches can hold settings.
    const watched = await getRedis().hget<unknown>(`watch:${id}`, parsed.data.mint);
    if (watched == null) return NextResponse.json({ error: "not_watched" }, { status: 404 });

    const rules = sanitizeRules(parsed.data.rules);
    await putTokenRules(id, parsed.data.mint, rules);
    return NextResponse.json({ rules });
  } catch (e) {
    console.error("token settings write failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
