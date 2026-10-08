export type MarkerShape = "arrowUp" | "arrowDown" | "circle";

export type MarkerEvent = {
  kind: string;
  value?: number;
};

type Look = { text: string; shape: MarkerShape; sign?: "+" | "−"; unit?: string };

const LOOKS: Record<string, Look> = {
  RUGGED: { text: "Rugged", shape: "arrowDown" },
  MINT_AUTHORITY_BACK: { text: "Mint auth", shape: "arrowDown" },
  FREEZE_AUTHORITY_BACK: { text: "Freeze auth", shape: "arrowDown" },
  TRANSFER_FEE: { text: "Fee", shape: "arrowDown" },
  EXIT_PATTERN: { text: "Exit?", shape: "arrowDown" },
  LIQUIDITY_DROP: { text: "Liq", shape: "arrowDown", sign: "−", unit: "%" },
  LIQUIDITY_UP: { text: "Liq", shape: "arrowUp", sign: "+", unit: "%" },
  LP_LOCK_DROP: { text: "LP lock", shape: "arrowDown", sign: "−", unit: "pt" },
  POOL_COUNT: { text: "Pool", shape: "circle" },
  PRICE_DROP: { text: "Price", shape: "arrowDown", sign: "−", unit: "%" },
  PRICE_SPIKE: { text: "Price", shape: "arrowUp", sign: "+", unit: "%" },
  VOLUME_SPIKE: { text: "Vol", shape: "circle", unit: "x" },
  FLOW_SELL_LED: { text: "Sell-led", shape: "arrowDown" },
  FLOW_BUY_LED: { text: "Buy-led", shape: "arrowUp" },
  CREATOR_SOLD: { text: "Dev", shape: "arrowDown", sign: "−", unit: "%" },
  TOP_HOLDER_UP: { text: "Top holder", shape: "arrowDown", sign: "+", unit: "pt" },
  HOLDERS_DROP: { text: "Holders", shape: "arrowDown", sign: "−", unit: "%" },
  INSIDERS_UP: { text: "Insiders", shape: "arrowDown", sign: "+", unit: "pt" },
  HEALTH_DROP: { text: "Health", shape: "arrowDown", sign: "−", unit: "" },
  HEALTH_RISE: { text: "Health", shape: "arrowUp", sign: "+", unit: "" },
  WHALE_BUY: { text: "Whale buy", shape: "arrowUp", unit: "% liq" },
  WHALE_SELL: { text: "Whale sell", shape: "arrowDown", unit: "% liq" },
  X_POST: { text: "X post", shape: "circle" },
  X_POST_POSSIBLE: { text: "X post?", shape: "circle" },
};

export function markerFor(e: MarkerEvent): {
  text: string;
  shape: MarkerShape;
  position: "aboveBar" | "belowBar";
} {
  const look =
    LOOKS[e.kind] ??
    ({ text: e.kind.toLowerCase().replace(/_/g, " "), shape: "circle" } as Look);
  const num = e.value === undefined ? "" : String(Number(e.value.toFixed(1)));
  const detail = num ? ` ${look.sign ?? ""}${num}${look.unit ?? ""}` : "";
  return {
    text: `${look.text}${detail}`,
    shape: look.shape,
    position: look.shape === "arrowUp" ? "belowBar" : "aboveBar",
  };
}

/** The candle an event belongs to: the last one that started at or before it. */
export function snapTime(times: number[], t: number): number | null {
  if (times.length === 0 || !Number.isFinite(t) || t < times[0]) return null;
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return times[lo];
}
