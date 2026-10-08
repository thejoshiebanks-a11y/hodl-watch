import { getRedis } from "@/lib/watch/redis";
import type { WatchEvent } from "@/lib/watch/detect";
import type { WatchEntry } from "@/lib/watch/types";
import { getSettings, getTokenRules } from "@/lib/watch/settings";
import { mergeRules } from "@/lib/watch/alert-catalog";
import { wantsPush } from "@/lib/watch/alert-filter";
import { SUB_DEVICES, sendPush } from "./send";

const COOLDOWN_SECONDS = 30 * 60;
const RANK = { critical: 0, warning: 1, info: 2 } as const;
const DOT = { critical: "🔴", warning: "🟡", info: "🔵" } as const;

export async function notifyWatchers(
  mint: string,
  symbol: string | null,
  events: WatchEvent[],
): Promise<{ watchers: number; pushed: number }> {
  if (events.length === 0) return { watchers: 0, pushed: 0 };
  const sorted = [...events].sort((a, b) => RANK[a.severity] - RANK[b.severity]);

  const redis = getRedis();
  const devices = await redis.smembers(`watchers:${mint}`);
  let pushed = 0;

  for (const device of devices) {
    // Only devices that turned alerts on.
    if (!(await redis.sismember(SUB_DEVICES, device))) continue;

    // Respect the per-token mute and this device's own alert settings.
    const entry = await redis.hget<WatchEntry>(`watch:${device}`, mint);
    if (entry?.muted) continue;

    const [base, override] = await Promise.all([
      getSettings(device),
      getTokenRules(device, mint),
    ]);
    const settings = { ...base, rules: mergeRules(base.rules, override) };
    const wanted = sorted.filter((e) => wantsPush(e, settings));
    if (wanted.length === 0) continue;

    const fresh: WatchEvent[] = [];
    for (const e of wanted) {
      const claimed = await redis.set(`pushcd:${device}:${mint}:${e.kind}`, 1, {
        nx: true,
        ex: COOLDOWN_SECONDS,
      });
      if (claimed) fresh.push(e);
    }
    if (fresh.length === 0) continue;

    const top = fresh[0];
    const more = fresh.length - 1;
    const result = await sendPush(device, {
      title: `${DOT[top.severity]} ${symbol ? `$${symbol}` : "Watched token"} · ${top.title}`,
      body:
        more > 0
          ? `${top.detail} · +${more} more, tap to review`
          : top.detail,
      url: `/?token=${encodeURIComponent(mint)}`,
      tag: `hodl-${mint}`,
    });
    if (result === "sent") pushed++;
  }

  return { watchers: devices.length, pushed };
}
