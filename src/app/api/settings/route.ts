import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeRules } from "@/lib/watch/alert-catalog";
import { getSettings, putSettings } from "@/lib/watch/settings";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

const Body = z
  .object({
    minSeverity: z.enum(["critical", "warning"]).optional(),
    rules: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => b.minSeverity !== undefined || b.rules !== undefined);

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
    const current = await getSettings(id);
    const next = {
      minSeverity: parsed.data.minSeverity ?? current.minSeverity,
      rules:
        parsed.data.rules !== undefined
          ? sanitizeRules(parsed.data.rules)
          : current.rules,
    };
    await putSettings(id, next);
    return NextResponse.json(next);
  } catch (e) {
    console.error("settings write failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
