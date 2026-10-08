import { DEVICE_ID_PATTERN } from "./types";

const KEY = "hodl.deviceId";

// Browser only. Returns null if storage is blocked.
export function getDeviceId(): string | null {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Used when linking: this browser adopts another device's ID. */
export function setDeviceId(id: string): boolean {
  if (!DEVICE_ID_PATTERN.test(id)) return false;
  try {
    window.localStorage.setItem(KEY, id);
    return true;
  } catch {
    return false;
  }
}
