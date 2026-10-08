import { NextResponse } from "next/server";
import { recentEvents } from "@/lib/watch/events";
import { getSettings, getTokenRules } from "@/lib/watch/settings";
import { mergeRules, type AlertRules } from "@/lib/watch/alert-catalog";
import { showInFeed } from "@/lib/watch/alert-filter";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mint = SolanaMintSchema.safeParse(new URL(request.url).searchParams.get("mint"));
  if (!mint.success) {
    return NextResponse.json({ error: "invalid_mint" }, { status: 400 });
  }
  const device = request.headers.get("x-device-id") ?? "";

  try {
    const events = await recentEvents(mint.data, 50);

    // Apply this device's own alert settings, like the Observe feed does.
    let rules: AlertRules = {};
    if (DEVICE_ID_PATTERN.test(device)) {
      const [s, o] = await Promise.all([
        getSettings(device),
        getTokenRules(device, mint.data),
      ]);
      rules = mergeRules(s.rules, o);
    }

    return NextResponse.json({
      events: events
        .filter((e) => showInFeed(e, rules))
        .map((e) => ({
          id: e.id,
          at: e.at,
          kind: e.kind,
          severity: e.severity,
          title: e.title,
          detail: e.detail,
          value: e.value,
          url: e.url,
        })),
    });
  } catch (e) {
    console.error("token events failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
