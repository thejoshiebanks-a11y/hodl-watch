import { NextResponse } from "next/server";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { pushEvents } from "@/lib/watch/events";
import { notifyWatchers } from "@/lib/push/notify";
import type { WatchEvent } from "@/lib/watch/detect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const mint = SolanaMintSchema.safeParse(searchParams.get("mint"));
  if (!mint.success) {
    return NextResponse.json({ error: "invalid_mint" }, { status: 400 });
  }

  const sev = searchParams.get("severity");
  const severity: WatchEvent["severity"] =
    sev === "critical" || sev === "warning" ? sev : "info";

  const event: WatchEvent = {
    kind: `TEST_${severity}_${Date.now()}`,
    severity,
    title: severity === "info" ? "Test event (ignore)" : "Test alert (ignore)",
    detail: "Sent by HODL to confirm alerts are working.",
  };

  const stored = await pushEvents(
    mint.data,
    null,
    new Date().toISOString(),
    [event],
  );

  const pushed =
    searchParams.get("push") === "1"
      ? await notifyWatchers(mint.data, null, [event])
      : null;

  return NextResponse.json({ sent: stored.length, pushed });
}
