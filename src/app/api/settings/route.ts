import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, putSettings } from "@/lib/watch/settings";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

const Body = z.object({ minSeverity: z.enum(["critical", "warning"]) });

function device(request: Request): string | null {
  const id = request.headers.get("x-device-id") ?? "";
  return DEVICE_ID_PATTERN.test(id) ? id : null;
}

export async function GET(request: Request) {
  const id = device(request);
  if (!id) return NextResponse.json({ error: "invalid_device" }, { status: 400 });
  try {
    return NextResponse.json(await getSettings(id));
  } catch (e) {
    console.error("settings read failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const id = device(request);
  if (!id) return NextResponse.json({ error: "invalid_device" }, { status: 400 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await putSettings(id, parsed.data);
    return NextResponse.json(parsed.data);
  } catch (e) {
    console.error("settings write failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
