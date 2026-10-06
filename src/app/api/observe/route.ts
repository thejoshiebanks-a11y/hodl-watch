import { NextResponse } from "next/server";
import { listWatches } from "@/lib/watch/store";
import { recentEvents } from "@/lib/watch/events";
import { getSettings } from "@/lib/watch/settings";
import { showInFeed } from "@/lib/watch/alert-filter";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const device = request.headers.get("x-device-id") ?? "";
  if (!DEVICE_ID_PATTERN.test(device)) {
    return NextResponse.json({ error: "invalid_device" }, { status: 400 });
  }

  try {
    const [watches, settings] = await Promise.all([
      listWatches(device),
      getSettings(device),
    ]);
    const lists = await Promise.all(
      watches.map((w) => recentEvents(w.mint, 20)),
    );
    const events = lists
      .flat()
      .filter((e) => showInFeed(e, settings.rules))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 50);
    return NextResponse.json({ events });
  } catch (e) {
    console.error("observe failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
