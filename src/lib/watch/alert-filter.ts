import {
  clampThreshold,
  defOf,
  shouldAlert,
  type AlertRules,
} from "./alert-catalog";
import type { WatchEvent } from "./detect";

export type FilterSettings = {
  minSeverity: "critical" | "warning";
  rules: AlertRules;
};

/**
 * Should this device get a push for this event?
 * "Critical only" mode silences everything else, except kinds the user
 * switched on by hand.
 */
export function wantsPush(e: WatchEvent, s: FilterSettings): boolean {
  const switchedOn = s.rules[e.kind]?.on === true;
  if (!switchedOn && s.minSeverity === "critical" && e.severity !== "critical") {
    return false;
  }
  return shouldAlert(e.kind, e.value ?? null, s.rules);
}

/**
 * Should this event show in the device's Observe feed? The feed is a record
 * of what happened, so it honours thresholds and explicit "off" choices but
 * not the push-only defaults.
 */
export function showInFeed(e: WatchEvent, rules: AlertRules): boolean {
  const def = defOf(e.kind);
  if (!def) return true;
  const rule = rules[e.kind];
  if (rule?.on === false) return false;
  if (!def.threshold || e.value === undefined) return true;
  return e.value >= clampThreshold(def.threshold, rule?.min ?? def.threshold.default);
}
