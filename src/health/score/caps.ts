import type { TokenIdentitySnapshot } from "@/lib/types/identity";
import type { TokenMarketSnapshot } from "@/lib/types/token";

export type HealthCap = { key: string; max: number; reason: string };
export type PeakInfo = { priceUsd: number | null; liquidityUsd: number | null };

const isNum = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// Provisional ceilings. A serious red flag sets a maximum the score can never
// exceed, whatever the average says. Sorted lowest first, so caps[0] binds.
export function computeCaps(
  market: TokenMarketSnapshot,
  identity: TokenIdentitySnapshot,
  peak: PeakInfo | null,
): HealthCap[] {
  const caps: HealthCap[] = [];
  const cap = (key: string, max: number, reason: string) =>
    caps.push({ key, max, reason });
  const p = market.periods;

  // Rug and crash
  if (identity.rugged === true) {
    cap("rugged", 1, "RugCheck flags this token as rugged.");
  }
  const d24 = p.h24.priceChangePct;
  const d6 = p.h6.priceChangePct;
  const d1 = p.h1.priceChangePct;
  if (isNum(d24) && d24 <= -70) {
    cap("crash_24h", 2, `Price is down ${Math.abs(d24).toFixed(0)}% in 24h.`);
  } else if (isNum(d24) && d24 <= -50) {
    cap("fall_24h", 3.5, `Price is down ${Math.abs(d24).toFixed(0)}% in 24h.`);
  }
  if (isNum(d6) && d6 <= -50) {
    cap("crash_6h", 3, `Price is down ${Math.abs(d6).toFixed(0)}% in 6h.`);
  }
  if (isNum(d1) && d1 <= -40) {
    cap("crash_1h", 3, `Price is down ${Math.abs(d1).toFixed(0)}% in 1h.`);
  }

  // Fall from the highest values we have recorded for this token
  if (peak) {
    const liq = market.liquidityUsd;
    if (isNum(peak.liquidityUsd) && peak.liquidityUsd > 0 && isNum(liq)) {
      const drop = (1 - liq / peak.liquidityUsd) * 100;
      const why = `Liquidity is ${usd(liq)}, down ${drop.toFixed(0)}% from its recorded peak of ${usd(peak.liquidityUsd)}.`;
      if (drop >= 70) cap("liquidity_peak_collapse", 2, why);
      else if (drop >= 50) cap("liquidity_peak_fall", 3.5, why);
    }
    const px = market.priceUsd;
    if (isNum(peak.priceUsd) && peak.priceUsd > 0 && isNum(px)) {
      const drop = (1 - px / peak.priceUsd) * 100;
      const why = `Price is down ${drop.toFixed(0)}% from its recorded peak.`;
      if (drop >= 80) cap("price_peak_collapse", 2.5, why);
      else if (drop >= 60) cap("price_peak_fall", 4, why);
    }
  }

  // Thin liquidity
  const liq = market.liquidityUsd;
  if (isNum(liq)) {
    if (liq < 5_000) cap("liquidity_tiny", 3, `Liquidity is only ${usd(liq)}.`);
    else if (liq < 20_000) cap("liquidity_thin", 5.5, `Liquidity is only ${usd(liq)}.`);
  }

  // Contract controls
  if (identity.mintAuthority === "SET") {
    cap("mint_authority", 4.5, "Mint authority is still set, so supply can be inflated.");
  }
  if (identity.freezeAuthority === "SET") {
    cap("freeze_authority", 5, "Freeze authority is still set, so wallets can be frozen.");
  }
  const fee = identity.transferFeePct;
  if (isNum(fee) && fee > 5) cap("transfer_fee_high", 3, `Transfer fee is ${fee}%.`);
  else if (isNum(fee) && fee > 0) cap("transfer_fee", 5.5, `Transfer fee is ${fee}%.`);

  // Concentration
  const top = identity.topHolderPctExcludingKnown ?? identity.topHolderPct;
  if (isNum(top)) {
    if (top >= 50) cap("top_holder_extreme", 3, `One wallet holds ${top.toFixed(0)}% of supply.`);
    else if (top >= 30) cap("top_holder_high", 5, `One wallet holds ${top.toFixed(0)}% of supply.`);
  }
  const ins = identity.insiderSupplyPct;
  if (isNum(ins)) {
    if (ins >= 40) cap("insiders_extreme", 3.5, `Insiders hold ${ins.toFixed(0)}% of supply.`);
    else if (ins >= 20) cap("insiders_high", 5.5, `Insiders hold ${ins.toFixed(0)}% of supply.`);
  }

  // Very young pool
  const born = Date.parse(market.pairCreatedAt ?? "");
  const seen = Date.parse(market.observedAt);
  if (Number.isFinite(born) && Number.isFinite(seen)) {
    const hours = (seen - born) / 3_600_000;
    if (hours < 1) cap("pool_new", 5, "The pool is under 1 hour old.");
    else if (hours < 24) cap("pool_young", 6.5, "The pool is under 24 hours old.");
  }

  // Sell-led flow with enough trades to mean something
  const b = p.h1.buys;
  const s = p.h1.sells;
  if (isNum(b) && isNum(s) && b + s >= 30 && b / (b + s) < 0.3) {
    cap("sell_pressure", 5.5, `Only ${Math.round((b / (b + s)) * 100)}% of the last hour's trades were buys.`);
  }

  return caps.sort((x, y) => x.max - y.max);
}
