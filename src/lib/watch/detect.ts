import type { WatchSnapshot } from "./snapshot";

export type Severity = "critical" | "warning" | "info";

export type WatchEvent = {
  kind: string;
  severity: Severity;
  title: string;
  detail: string;
  /** How big the change was (always positive), in the unit the alert catalog uses. */
  value?: number;
  /** Link to the source, such as an X post. */
  url?: string;
  /** Keeps the stored event id unique when events share a timestamp and kind. */
  key?: string;
};

const RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

const f1 = (n: number) => n.toFixed(1);
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;
const num = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);
const pctChange = (a: number, b: number) => ((b - a) / a) * 100;
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const r2 = (n: number) => Math.round(n * 100) / 100;

function movers(prev: WatchSnapshot, curr: WatchSnapshot): string {
  const rows = Object.keys(curr.domains)
    .map((k) => {
      const a = prev.domains[k];
      const b = curr.domains[k];
      return num(a) && num(b) ? ([k, b - a] as const) : null;
    })
    .filter((r): r is readonly [string, number] => r !== null && Math.abs(r[1]) >= 0.1)
    .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
    .slice(0, 3);
  return rows.length
    ? rows.map(([k, d]) => `${cap(k)} ${signed(d)}`).join(", ")
    : "no single domain stands out";
}

// The detector reports every change down to the smallest size a user can ask
// for. Each device's own settings decide which ones are worth a push.
export function detectEvents(
  prev: WatchSnapshot,
  curr: WatchSnapshot,
): WatchEvent[] {
  const out: WatchEvent[] = [];
  const add = (
    kind: string,
    severity: Severity,
    title: string,
    detail: string,
    value?: number,
  ) =>
    out.push(
      value === undefined
        ? { kind, severity, title, detail }
        : { kind, severity, title, detail, value: r2(value) },
    );

  // Health
  if (num(prev.health) && num(curr.health)) {
    const d = curr.health - prev.health;
    if (d <= -0.5) {
      add(
        "HEALTH_DROP",
        d <= -2 ? "critical" : "warning",
        `Health fell ${f1(prev.health)} → ${f1(curr.health)}`,
        `Moved by: ${movers(prev, curr)}.`,
        Math.abs(d),
      );
    } else if (d >= 0.5) {
      add(
        "HEALTH_RISE",
        "info",
        `Health rose ${f1(prev.health)} → ${f1(curr.health)}`,
        `Moved by: ${movers(prev, curr)}.`,
        d,
      );
    }
  }

  // Contract and security
  if (prev.rugged === false && curr.rugged === true) {
    add("RUGGED", "critical", "Flagged as rugged", "RugCheck now marks this token as rugged.");
  }
  const auth: [string, string, string][] = [
    ["Mint", prev.mintAuthority, curr.mintAuthority],
    ["Freeze", prev.freezeAuthority, curr.freezeAuthority],
  ];
  for (const [label, a, b] of auth) {
    if (a === "REVOKED" && b === "SET") {
      add(
        `${label.toUpperCase()}_AUTHORITY_BACK`,
        "critical",
        `${label} authority is set again`,
        `It was revoked on the last scan.`,
      );
    }
  }
  if (!(prev.transferFeePct ?? 0) && (curr.transferFeePct ?? 0) > 0) {
    add(
      "TRANSFER_FEE",
      "critical",
      "A transfer fee appeared",
      `Transfer fee is now ${curr.transferFeePct}%.`,
    );
  }

  // Liquidity
  if (num(prev.liquidityUsd) && num(curr.liquidityUsd) && prev.liquidityUsd > 0) {
    const c = pctChange(prev.liquidityUsd, curr.liquidityUsd);
    const money = `$${Math.round(prev.liquidityUsd).toLocaleString("en-US")} → $${Math.round(curr.liquidityUsd).toLocaleString("en-US")} since the last scan.`;
    if (c <= -5) {
      add(
        "LIQUIDITY_DROP",
        c <= -30 ? "critical" : "warning",
        `Liquidity down ${Math.abs(c).toFixed(0)}%`,
        money,
        Math.abs(c),
      );
    } else if (c >= 5) {
      add("LIQUIDITY_UP", "info", `Liquidity up ${c.toFixed(0)}%`, money, c);
    }
  }
  if (num(prev.lpLockedPct) && num(curr.lpLockedPct)) {
    const d = curr.lpLockedPct - prev.lpLockedPct;
    if (d <= -2) {
      add(
        "LP_LOCK_DROP",
        d <= -20 ? "critical" : "warning",
        `LP locked fell ${prev.lpLockedPct.toFixed(0)}% → ${curr.lpLockedPct.toFixed(0)}%`,
        "Less of the liquidity is locked than on the last scan.",
        Math.abs(d),
      );
    }
  }
  if (num(prev.poolCount) && num(curr.poolCount) && prev.poolCount !== curr.poolCount) {
    add(
      "POOL_COUNT",
      "info",
      `Pool count ${prev.poolCount} → ${curr.poolCount}`,
      "Liquidity pools were added or removed.",
    );
  }

  // Price
  if (num(prev.priceUsd) && num(curr.priceUsd) && prev.priceUsd > 0) {
    const c = pctChange(prev.priceUsd, curr.priceUsd);
    if (c <= -3) {
      add(
        "PRICE_DROP",
        c <= -25 ? "critical" : "warning",
        `Price down ${Math.abs(c).toFixed(1)}%`,
        "Move since the last scan.",
        Math.abs(c),
      );
    } else if (c >= 3) {
      add("PRICE_SPIKE", "info", `Price up ${c.toFixed(1)}%`, "Move since the last scan.", c);
    }
  }

  // Flow
  if (num(prev.buyShare) && num(curr.buyShare)) {
    if (prev.buyShare >= 55 && curr.buyShare <= 45) {
      add(
        "FLOW_SELL_LED",
        "warning",
        "Flow flipped sell-led",
        `Buys were ${prev.buyShare.toFixed(0)}% of trades, now ${curr.buyShare.toFixed(0)}%.`,
      );
    } else if (prev.buyShare <= 45 && curr.buyShare >= 55) {
      add(
        "FLOW_BUY_LED",
        "info",
        "Flow flipped buy-led",
        `Buys were ${prev.buyShare.toFixed(0)}% of trades, now ${curr.buyShare.toFixed(0)}%.`,
      );
    }
  }

  // Volume spike: last-hour volume against the 24h hourly average
  const ratio = (s: WatchSnapshot) =>
    num(s.volume1hUsd) && num(s.volume24hUsd) && s.volume24hUsd > 0
      ? s.volume1hUsd / (s.volume24hUsd / 24)
      : null;
  const rp = ratio(prev);
  const rc = ratio(curr);
  if (rc !== null && rc >= 2 && (rp === null || rp < 2 || rc >= rp * 1.25)) {
    add(
      "VOLUME_SPIKE",
      "info",
      `Volume spike (${rc.toFixed(1)}x normal)`,
      "Last-hour volume is far above this token's 24h hourly average.",
      rc,
    );
  }

  // Holders and creator
  if (num(prev.topHolderPct) && num(curr.topHolderPct)) {
    const d = curr.topHolderPct - prev.topHolderPct;
    if (d >= 0.5) {
      add(
        "TOP_HOLDER_UP",
        "warning",
        `Top holder rose to ${curr.topHolderPct.toFixed(1)}%`,
        `Up ${d.toFixed(1)} points since the last scan.`,
        d,
      );
    }
  }
  if (num(prev.holderCount) && num(curr.holderCount) && prev.holderCount > 0) {
    const c = pctChange(prev.holderCount, curr.holderCount);
    if (c <= -1) {
      add(
        "HOLDERS_DROP",
        "warning",
        `Holder count down ${Math.abs(c).toFixed(1)}%`,
        `${prev.holderCount.toLocaleString("en-US")} → ${curr.holderCount.toLocaleString("en-US")}.`,
        Math.abs(c),
      );
    }
  }
  if (num(prev.insiderSupplyPct) && num(curr.insiderSupplyPct)) {
    const d = curr.insiderSupplyPct - prev.insiderSupplyPct;
    if (d >= 1) {
      add(
        "INSIDERS_UP",
        "warning",
        `Insider supply rose to ${curr.insiderSupplyPct.toFixed(1)}%`,
        `Up ${d.toFixed(1)} points since the last scan.`,
        d,
      );
    }
  }
  if (
    num(prev.creatorBalance) &&
    num(curr.creatorBalance) &&
    prev.creatorBalance > 0 &&
    curr.creatorBalance <= prev.creatorBalance * 0.95
  ) {
    const c = pctChange(prev.creatorBalance, curr.creatorBalance);
    add(
      "CREATOR_SOLD",
      "critical",
      `Creator balance fell ${Math.abs(c).toFixed(0)}%`,
      "The creator wallet holds less than on the last scan, which usually means a sale or transfer.",
      Math.abs(c),
    );
  }

  // Combined pattern. It keeps its own fixed bar (creator down 10%+ and
  // liquidity down 15%+, or sell-led flow) so small moves never raise it.
  const valueOf = (kind: string) => out.find((e) => e.kind === kind)?.value ?? 0;
  const creatorSold = valueOf("CREATOR_SOLD") >= 10;
  const liquidityDropped = valueOf("LIQUIDITY_DROP") >= 15;
  const sellLed = out.some((e) => e.kind === "FLOW_SELL_LED");
  if (creatorSold && (liquidityDropped || sellLed)) {
    add(
      "EXIT_PATTERN",
      "critical",
      "Possible exit pattern",
      "The creator balance dropped while liquidity fell or flow turned sell-led. This is a pattern worth checking now, not a certainty.",
    );
  }

  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}
