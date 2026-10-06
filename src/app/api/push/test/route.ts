import { NextResponse } from "next/server";
import { getRedis } from "@/lib/watch/redis";
import { sendPush } from "@/lib/push/send";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const id = request.headers.get("x-device-id") ?? "";
  if (!DEVICE_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "invalid_device" }, { status: 400 });
  }

  try {
    // One test per 30 seconds per device.
    const first = await getRedis().set(`pushtest:${id}`, 1, { nx: true, ex: 30 });
    if (!first) {
      return NextResponse.json({ error: "too_soon" }, { status: 429 });
    }

    const result = await sendPush(id, {
      title: "HODL alerts are on",
      body: "This is a test. Real alerts will explain what changed and why.",
      url: "/",
      tag: "hodl-test",
    });

    return NextResponse.json({ result }, { status: result === "sent" ? 200 : 502 });
  } catch (e) {
    console.error("push test failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
