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
