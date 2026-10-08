import { getRedis } from "./redis";
import type { WatchEvent } from "./detect";
import { clampThreshold, defOf, type AlertRules } from "./alert-catalog";
import { decideMark, markChangePct, type MarkZone } from "./mark-match";

export type ServerMark = {
  mint: string;
  symbol: string | null;
  price: number | null;
  health: number | null;
  at: string;
};

const markKey = (device: string, mint: string) => `mark:${device}:${mint}`;
const stateKey = (device: string, mint: string) => `markstate:${device}:${mint}`;
/** Devices that have a mark on this token, so scans can skip everyone else. */
const watchKey = (mint: string) => `markwatch:${mint}`;

export async function getMark(device: string, mint: string): Promise<ServerMark | null> {
  return (await getRedis().get<ServerMark>(markKey(device, mint))) ?? null;
}

export async function putMark(device: string, m: ServerMark): Promise<void> {
  const redis = getRedis();
  await redis.set(markKey(device, m.mint), m);
  await redis.sadd(watchKey(m.mint), device);
  await redis.del(stateKey(device, m.mint));
}

export async function delMark(device: string, mint: string): Promise<void> {
  const redis = getRedis();
  await redis.del(markKey(device, mint), stateKey(device, mint));
  await redis.srem(watchKey(mint), device);
}

/** Of these watchers, the ones that have a mark on this token. */
export async function markDevicesAmong(mint: string, devices: string[]): Promise<string[]> {
  if (devices.length === 0) return [];
  const have = new Set(await getRedis().smembers(watchKey(mint)));
  return devices.filter((d) => have.has(d));
}

/** The threshold if this rule is on for the device, otherwise null. */
function activeMin(kind: string, rules: AlertRules): number | null {
  const def = defOf(kind);
  if (!def?.threshold) return null;
  const rule = rules[kind];
  if (!(rule?.on ?? def.defaultOn)) return null;
  return clampThreshold(def.threshold, rule?.min ?? def.threshold.default);
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4, maximumFractionDigits: 12 });
}

/** A mark alert for this device, only at the moment the price crosses its threshold. */
export async function markEventsFor(
  device: string,
  mint: string,
  priceUsd: number,
  rules: AlertRules,
): Promise<WatchEvent[]> {
  const belowMin = activeMin("MARK_BELOW", rules);
  const aboveMin = activeMin("MARK_ABOVE", rules);
  if (belowMin === null && aboveMin === null) return [];

  const redis = getRedis();
  const mark = await getMark(device, mint);
  if (!mark || mark.price === null) return [];

  const pct = markChangePct(mark.price, priceUsd);
  const raw = await redis.get<string>(stateKey(device, mint));
  const prev: MarkZone = raw === "below" || raw === "above" ? raw : "none";
  const d = decideMark(pct, belowMin, aboveMin, prev);
  if (d.zone !== prev) await redis.set(stateKey(device, mint), d.zone, { ex: 30 * 86_400 });
  if (!d.fire || pct === null) return [];

  const abs = Math.abs(pct);
  return [
    {
      kind: d.fire,
      severity: "warning",
      title: `Price is ${Math.round(abs)}% ${d.fire === "MARK_BELOW" ? "below" : "above"} your mark`,
      detail: `Now $${fmt(priceUsd)}, your mark was $${fmt(mark.price)}.`,
      value: abs,
      key: "mark",
    },
  ];
}
