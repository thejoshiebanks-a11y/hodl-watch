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

export const subKey = (device: string) => `push:${device}`;
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

export async function sendPush(
  device: string,
  payload: PushPayload,
): Promise<"sent" | "no_subscription" | "expired" | "failed" | "not_configured"> {
  if (!init()) return "not_configured";

  const redis = getRedis();
  const sub = await redis.get<StoredSub>(subKey(device));
  if (!sub) return "no_subscription";

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), {
      TTL: 3600,
      urgency: "high",
    });
    return "sent";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await redis.del(subKey(device));
      await redis.srem(SUB_DEVICES, device);
      return "expired";
    }
    console.error("push failed:", e);
    return "failed";
  }
}
