import type { StoredEvent } from "./events";

export type FeedGroup = {
  id: string;
  mint: string;
  symbol: string | null;
  severity: StoredEvent["severity"];
  events: StoredEvent[]; // newest first
};

export const GROUP_WINDOW_MS = 3 * 3600_000;

const RANK = { info: 0, warning: 1, critical: 2 } as const;

/**
 * Collapses alerts for the same token that are close together in time.
 * A group keeps growing while each next alert is within the window of the
 * previous one. The group takes the worst severity of its alerts.
 */
export function groupEvents(
  events: StoredEvent[],
  windowMs = GROUP_WINDOW_MS,
): FeedGroup[] {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  const groups: FeedGroup[] = [];
  const open = new Map<string, FeedGroup>();

  for (const e of sorted) {
    const g = open.get(e.mint);
    const last = g ? Date.parse(g.events[g.events.length - 1].at) : NaN;
    if (g && last - Date.parse(e.at) <= windowMs) {
      g.events.push(e);
      if (RANK[e.severity] > RANK[g.severity]) g.severity = e.severity;
    } else {
      const fresh: FeedGroup = {
        id: `${e.mint}-${e.id}`,
        mint: e.mint,
        symbol: e.symbol,
        severity: e.severity,
        events: [e],
      };
      groups.push(fresh);
      open.set(e.mint, fresh);
    }
  }
  return groups;
}
