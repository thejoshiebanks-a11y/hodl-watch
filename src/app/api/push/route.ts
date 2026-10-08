import { NextResponse } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/watch/redis";
import { SUB_DEVICES, cleanupDevice, subKey, subsKey, type StoredSub } from "@/lib/push/send";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

const SubSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().max(200),
    auth: z.string().max(100),
  }),
});

const device = (r: Request) => {
  const id = r.headers.get("x-device-id") ?? "";
  return DEVICE_ID_PATTERN.test(id) ? id : null;
};

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  const id = device(request);
  if (!id) return NextResponse.json({ error: "invalid_device" }, { status: 400 });

  const parsed = SubSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    await redis.hset(subsKey(id), { [parsed.data.endpoint]: parsed.data });
    await redis.sadd(SUB_DEVICES, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push subscribe failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const id = device(request);
  if (!id) return NextResponse.json({ error: "invalid_device" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

  try {
    const redis = getRedis();
    if (endpoint) {
      // Only this physical device. Other linked devices keep their alerts.
      await redis.hdel(subsKey(id), endpoint);
      const legacy = await redis.get<StoredSub>(subKey(id));
      if (legacy?.endpoint === endpoint) await redis.del(subKey(id));
      await cleanupDevice(id);
    } else {
      await redis.del(subKey(id), subsKey(id));
      await redis.srem(SUB_DEVICES, id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push unsubscribe failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
