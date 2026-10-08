export type AlertCategory = "safety" | "liquidity" | "market" | "holders" | "health" | "social";

export const CATEGORY_LABELS: Record<AlertCategory, string> = {
  safety: "Contract and safety",
  liquidity: "Liquidity",
  market: "Price and volume",
  holders: "Holders and wallets",
  health: "Health score",
  social: "X posts from tracked accounts",
};

export type Threshold = {
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type AlertDef = {
  kind: string;
  label: string;
  category: AlertCategory;
  defaultOn: boolean;
  threshold?: Threshold;
};

const t = (unit: string, min: number, max: number, step: number, d: number): Threshold => ({
  unit,
  min,
  max,
  step,
  default: d,
});

export const ALERT_CATALOG: AlertDef[] = [
  { kind: "RUGGED", label: "Flagged as rugged", category: "safety", defaultOn: true },
  { kind: "MINT_AUTHORITY_BACK", label: "Mint authority set again", category: "safety", defaultOn: true },
  { kind: "FREEZE_AUTHORITY_BACK", label: "Freeze authority set again", category: "safety", defaultOn: true },
  { kind: "TRANSFER_FEE", label: "Transfer fee appeared", category: "safety", defaultOn: true },
  { kind: "EXIT_PATTERN", label: "Possible exit pattern", category: "safety", defaultOn: true },

  { kind: "LIQUIDITY_DROP", label: "Liquidity drops", category: "liquidity", defaultOn: true, threshold: t("%", 5, 90, 1, 15) },
  { kind: "LIQUIDITY_UP", label: "Liquidity added", category: "liquidity", defaultOn: false, threshold: t("%", 5, 500, 5, 25) },
  { kind: "LP_LOCK_DROP", label: "Locked liquidity falls", category: "liquidity", defaultOn: true, threshold: t("points", 2, 100, 1, 5) },
  { kind: "POOL_COUNT", label: "Pool added or removed", category: "liquidity", defaultOn: false },

  { kind: "PRICE_DROP", label: "Price drops", category: "market", defaultOn: true, threshold: t("%", 3, 90, 1, 10) },
  { kind: "PRICE_SPIKE", label: "Price rises", category: "market", defaultOn: false, threshold: t("%", 3, 500, 1, 10) },
  { kind: "VOLUME_SPIKE", label: "Volume spike", category: "market", defaultOn: false, threshold: t("x normal", 2, 50, 1, 5) },
  { kind: "FLOW_SELL_LED", label: "Flow turns sell-led", category: "market", defaultOn: true },
  { kind: "FLOW_BUY_LED", label: "Flow turns buy-led", category: "market", defaultOn: false },

  { kind: "CREATOR_SOLD", label: "Creator balance falls", category: "holders", defaultOn: true, threshold: t("% sold", 5, 100, 5, 10) },
  { kind: "TOP_HOLDER_UP", label: "Top holder grows", category: "holders", defaultOn: true, threshold: t("points", 0.5, 20, 0.5, 2) },
  { kind: "HOLDERS_DROP", label: "Holder count falls", category: "holders", defaultOn: true, threshold: t("%", 1, 50, 1, 5) },
  { kind: "INSIDERS_UP", label: "Insider supply grows", category: "holders", defaultOn: true, threshold: t("points", 1, 30, 1, 3) },
  { kind: "WHALE_BUY", label: "Whale buys", category: "holders", defaultOn: true, threshold: t("% of liquidity", 1, 50, 0.5, 5) },
  { kind: "WHALE_SELL", label: "Whale sells", category: "holders", defaultOn: true, threshold: t("% of liquidity", 1, 50, 0.5, 5) },

  { kind: "HEALTH_DROP", label: "Health score falls", category: "health", defaultOn: true, threshold: t("points", 0.5, 5, 0.5, 1) },
  { kind: "HEALTH_RISE", label: "Health score rises", category: "health", defaultOn: false, threshold: t("points", 0.5, 5, 0.5, 1) },

  { kind: "X_POST", label: "Tracked account posts this token's address", category: "social", defaultOn: true },
  { kind: "X_POST_POSSIBLE", label: "Tracked account posts its $symbol only (unconfirmed)", category: "social", defaultOn: false },
  { kind: "CA_POSTED", label: "Token's own X account posts its address", category: "social", defaultOn: true },
];

export type AlertRule = { on?: boolean; min?: number };
export type AlertRules = Record<string, AlertRule>;

export function defOf(kind: string): AlertDef | undefined {
  return ALERT_CATALOG.find((d) => d.kind === kind);
}

export function clampThreshold(th: Threshold, v: number): number {
  return Math.min(Math.max(v, th.min), th.max);
}

/** Should this device be pushed an alert of this kind and size? */
export function shouldAlert(
  kind: string,
  value: number | null,
  rules: AlertRules | undefined,
): boolean {
  const def = defOf(kind);
  if (!def) return false;
  const rule = rules?.[kind];
  if (!(rule?.on ?? def.defaultOn)) return false;
  if (!def.threshold || value === null) return true;
  return value >= clampThreshold(def.threshold, rule?.min ?? def.threshold.default);
}

/** Keep only known kinds with valid values, so bad input never gets stored. */
export function sanitizeRules(input: unknown): AlertRules {
  const out: AlertRules = {};
  if (typeof input !== "object" || input === null) return out;
  for (const [kind, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = defOf(kind);
    if (!def || typeof raw !== "object" || raw === null) continue;
    const r = raw as { on?: unknown; min?: unknown };
    const rule: AlertRule = {};
    if (typeof r.on === "boolean") rule.on = r.on;
    if (def.threshold && typeof r.min === "number" && Number.isFinite(r.min)) {
      rule.min = clampThreshold(def.threshold, r.min);
    }
    if (Object.keys(rule).length > 0) out[kind] = rule;
  }
  return out;
}

/** Per-token overrides sit on top of the device's global rules, kind by kind. */
export function mergeRules(global: AlertRules, override: AlertRules): AlertRules {
  const out: AlertRules = { ...global };
  for (const [kind, rule] of Object.entries(override)) {
    out[kind] = { ...global[kind], ...rule };
  }
  return out;
}
