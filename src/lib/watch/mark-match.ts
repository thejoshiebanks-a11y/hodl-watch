export type MarkZone = "below" | "above" | "none";
export type MarkKind = "MARK_BELOW" | "MARK_ABOVE";

/** Percent change from the user's mark to the current price. Null if either is unusable. */
export function markChangePct(mark: number | null, now: number | null): number | null {
  if (mark === null || now === null) return null;
  if (!Number.isFinite(mark) || !Number.isFinite(now) || mark <= 0 || now < 0) return null;
  return ((now - mark) / mark) * 100;
}

/**
 * Fires once when the price crosses a threshold, then stays quiet until it comes back inside.
 * A min of null means that rule is off.
 */
export function decideMark(
  pct: number | null,
  belowMin: number | null,
  aboveMin: number | null,
  prev: MarkZone,
): { fire: MarkKind | null; zone: MarkZone } {
  if (pct === null) return { fire: null, zone: prev };
  if (belowMin !== null && pct <= -belowMin) {
    return { fire: prev === "below" ? null : "MARK_BELOW", zone: "below" };
  }
  if (aboveMin !== null && pct >= aboveMin) {
    return { fire: prev === "above" ? null : "MARK_ABOVE", zone: "above" };
  }
  return { fire: null, zone: "none" };
}
