export type WatchEntry = {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  addedAt: string;
  lastHealth: number | null;
  lastScanAt: string | null;
  muted?: boolean;
};

export const MAX_WATCHES_PER_DEVICE = 25;
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
