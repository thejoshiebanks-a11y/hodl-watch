import { getRedis } from "./redis";

export type AlertSettings = { minSeverity: "critical" | "warning" };

export const DEFAULT_SETTINGS: AlertSettings = { minSeverity: "warning" };

const key = (device: string) => `settings:${device}`;

export async function getSettings(device: string): Promise<AlertSettings> {
  const s = await getRedis().get<AlertSettings>(key(device));
  return s?.minSeverity === "critical" || s?.minSeverity === "warning"
    ? s
    : DEFAULT_SETTINGS;
}

export async function putSettings(
  device: string,
  s: AlertSettings,
): Promise<void> {
  await getRedis().set(key(device), s);
}
