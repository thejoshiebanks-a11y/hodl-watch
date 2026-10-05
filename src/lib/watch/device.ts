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
