import { getRedis } from "./redis";
import { sanitizeRules, type AlertRules } from "./alert-catalog";

export type AlertSettings = {
  minSeverity: "critical" | "warning";
  rules: AlertRules;
};

export const DEFAULT_SETTINGS: AlertSettings = { minSeverity: "warning", rules: {} };

const key = (device: string) => `settings:${device}`;

export async function getSettings(device: string): Promise<AlertSettings> {
  const s = await getRedis().get<Partial<AlertSettings>>(key(device));
  return {
    minSeverity: s?.minSeverity === "critical" ? "critical" : "warning",
    rules: sanitizeRules(s?.rules),
  };
}

export async function putSettings(
  device: string,
  s: AlertSettings,
): Promise<void> {
  await getRedis().set(key(device), s);
}

const tokenKey = (device: string, mint: string) => `settings:${device}:${mint}`;

export async function getTokenRules(device: string, mint: string): Promise<AlertRules> {
  return sanitizeRules(await getRedis().get<unknown>(tokenKey(device, mint)));
}

export async function getTokenRulesMany(
  device: string,
  mints: string[],
): Promise<Record<string, AlertRules>> {
  if (mints.length === 0) return {};
  const raw = await getRedis().mget<unknown[]>(...mints.map((m) => tokenKey(device, m)));
  const out: Record<string, AlertRules> = {};
  mints.forEach((m, i) => {
    out[m] = sanitizeRules(raw[i]);
  });
  return out;
}

export async function putTokenRules(
  device: string,
  mint: string,
  rules: AlertRules,
): Promise<void> {
  if (Object.keys(rules).length === 0) {
    await getRedis().del(tokenKey(device, mint));
    return;
  }
  await getRedis().set(tokenKey(device, mint), rules);
}
