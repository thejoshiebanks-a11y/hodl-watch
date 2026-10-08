import webpush from "web-push";
import { getRedis } from "@/lib/watch/redis";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type StoredSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Old single-subscription key. Still read, so existing alerts keep working. */
export const subKey = (device: string) => `push:${device}`;
/** One entry per physical device, keyed by its push endpoint. */
export const subsKey = (device: string) => `pushsubs:${device}`;
export const SUB_DEVICES = "push:devices";

let ready = false;

function init(): boolean {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://hodl-watch-rho.vercel.app",
    pub,
    priv,
  );
  ready = true;
  return true;
}

/** Removes the device from the alert list once it has no subscriptions left. */
export async function cleanupDevice(device: string): Promise<void> {
  const redis = getRedis();
  const [many, legacy] = await Promise.all([
    redis.hlen(subsKey(device)),
    redis.exists(subKey(device)),
  ]);
  if (many === 0 && legacy === 0) await redis.srem(SUB_DEVICES, device);
}

export async function sendPush(
  device: string,
  payload: PushPayload,
): Promise<"sent" | "no_subscription" | "expired" | "failed" | "not_configured"> {
  if (!init()) return "not_configured";

  const redis = getRedis();
  const [many, legacy] = await Promise.all([
    redis.hgetall<Record<string, StoredSub>>(subsKey(device)),
    redis.get<StoredSub>(subKey(device)),
  ]);
  const subs = new Map<string, StoredSub>();
  if (legacy?.endpoint) subs.set(legacy.endpoint, legacy);
  for (const s of Object.values(many ?? {})) if (s?.endpoint) subs.set(s.endpoint, s);
  if (subs.size === 0) return "no_subscription";

  let sent = 0;
  let expired = 0;
  let failed = 0;
  for (const sub of subs.values()) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), {
        TTL: 3600,
        urgency: "high",
      });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        expired++;
        await redis.hdel(subsKey(device), sub.endpoint);
        if (legacy?.endpoint === sub.endpoint) await redis.del(subKey(device));
      } else {
        console.error("push failed:", e);
        failed++;
      }
    }
  }
  if (expired > 0) await cleanupDevice(device);
  if (sent > 0) return "sent";
  return failed > 0 ? "failed" : "expired";
}
