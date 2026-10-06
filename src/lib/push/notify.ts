import { getRedis } from "@/lib/watch/redis";
import type { WatchEvent } from "@/lib/watch/detect";
import { SUB_DEVICES, sendPush } from "./send";

const COOLDOWN_SECONDS = 30 * 60;
const RANK = { critical: 0, warning: 1, info: 2 } as const;

export async function notifyWatchers(
  mint: string,
  symbol: string | null,
  events: WatchEvent[],
): Promise<{ watchers: number; pushed: number }> {
  const loud = events
    .filter((e) => e.severity !== "info")
    .sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  if (loud.length === 0) return { watchers: 0, pushed: 0 };

  const redis = getRedis();
  const devices = await redis.smembers(`watchers:${mint}`);
  let pushed = 0;

  for (const device of devices) {
    // Only devices that turned alerts on.
    if (!(await redis.sismember(SUB_DEVICES, device))) continue;

    const fresh: WatchEvent[] = [];
    for (const e of loud) {
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
      title: `${symbol ? `$${symbol}` : "A watched token"}: ${top.title}`,
      body:
        more > 0
          ? `${top.detail} (+${more} more change${more > 1 ? "s" : ""})`
          : top.detail,
      url: "/",
      tag: `hodl-${mint}`,
    });
    if (result === "sent") pushed++;
  }

  return { watchers: devices.length, pushed };
}
