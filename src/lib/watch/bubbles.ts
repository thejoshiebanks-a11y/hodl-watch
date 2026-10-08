import type { Severity } from "./detect";

export type Side = "above" | "below";

type Ev = { id: string; at: string; severity: Severity; kind: string };

export type Placed<T> = { x: number; y: number; side: Side; event: T };

export type Cluster<T> = {
  key: string;
  x: number;
  y: number;
  side: Side;
  /** Most important first: severity, then newest. */
  events: T[];
};

const RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export function byImportance(a: Ev, b: Ev): number {
  return (
    RANK[a.severity] - RANK[b.severity] ||
    (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0)
  );
}

/**
 * Merges bubbles that would overlap on screen. Works in pixels, so zooming
 * in splits a cluster and zooming out merges it again.
 */
export function clusterBubbles<T extends Ev>(
  items: Placed<T>[],
  gap = 30,
): Cluster<T>[] {
  const out: Cluster<T>[] = [];

  for (const side of ["above", "below"] as const) {
    const row = items.filter((i) => i.side === side).sort((a, b) => a.x - b.x);
    let cur: Placed<T>[] = [];

    const flush = () => {
      if (cur.length === 0) return;
      const ys = cur.map((i) => i.y);
      const events = cur.map((i) => i.event).sort(byImportance);
      out.push({
        key: `${side}:${events[0].id}`,
        x: cur.reduce((s, i) => s + i.x, 0) / cur.length,
        y: side === "above" ? Math.min(...ys) : Math.max(...ys),
        side,
        events,
      });
      cur = [];
    };

    for (const it of row) {
      if (cur.length > 0 && it.x - cur[0].x > gap) flush();
      cur.push(it);
    }
    flush();
  }
  return out;
}

export function glyphFor(kind: string, side: Side): string {
  if (kind.startsWith("X_POST")) return "𝕏";
  if (kind.startsWith("WHALE")) return "🐋";
  if (kind.startsWith("LIQUIDITY") || kind === "LP_LOCK_DROP" || kind === "POOL_COUNT") return "💧";
  if (
    kind === "RUGGED" ||
    kind === "EXIT_PATTERN" ||
    kind === "TRANSFER_FEE" ||
    kind.endsWith("_AUTHORITY_BACK")
  ) {
    return "⚠️";
  }
  if (kind === "VOLUME_SPIKE") return "⚡";
  if (kind.startsWith("HEALTH")) return "♥";
  if (["CREATOR_SOLD", "TOP_HOLDER_UP", "HOLDERS_DROP", "INSIDERS_UP"].includes(kind)) return "👥";
  return side === "below" ? "▲" : "▼";
}
