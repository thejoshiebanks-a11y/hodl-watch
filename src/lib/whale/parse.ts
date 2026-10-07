export type HeliusTransfer = {
  fromUserAccount?: string | null;
  toUserAccount?: string | null;
  mint?: string;
  tokenAmount?: number;
};

export type ParsedSwap = {
  signature: string;
  at: string;
  mint: string;
  side: "buy" | "sell";
  tokens: number;
  wallet: string;
};

// Gives trades from the same second different ids, and the same trade the
// same id if Helius delivers it twice.
function msFromSignature(sig: string): number {
  let n = 0;
  for (const ch of sig) n = (n * 31 + ch.charCodeAt(0)) % 1000;
  return n;
}

/**
 * Reads a Helius enhanced-transaction payload. The trader is the fee payer;
 * their net movement of a watched token decides buy or sell, so hops through
 * routers and pools cancel out.
 */
export function parseSwaps(input: unknown, watched: Set<string>): ParsedSwap[] {
  if (!Array.isArray(input)) return [];
  const out: ParsedSwap[] = [];

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;
    const tx = raw as {
      signature?: unknown;
      timestamp?: unknown;
      feePayer?: unknown;
      tokenTransfers?: unknown;
    };
    const { signature, feePayer } = tx;
    if (typeof signature !== "string" || typeof feePayer !== "string") continue;
    if (!Array.isArray(tx.tokenTransfers)) continue;

    const net = new Map<string, number>();
    for (const t of tx.tokenTransfers as HeliusTransfer[]) {
      if (!t || typeof t.mint !== "string" || !watched.has(t.mint)) continue;
      if (typeof t.tokenAmount !== "number" || !Number.isFinite(t.tokenAmount)) continue;
      let d = 0;
      if (t.toUserAccount === feePayer) d += t.tokenAmount;
      if (t.fromUserAccount === feePayer) d -= t.tokenAmount;
      if (d !== 0) net.set(t.mint, (net.get(t.mint) ?? 0) + d);
    }

    const seconds =
      typeof tx.timestamp === "number" && Number.isFinite(tx.timestamp)
        ? tx.timestamp
        : Date.now() / 1000;
    const at = new Date(
      Math.floor(seconds) * 1000 + msFromSignature(signature),
    ).toISOString();

    for (const [mint, d] of net) {
      if (d === 0) continue;
      out.push({
        signature,
        at,
        mint,
        side: d > 0 ? "buy" : "sell",
        tokens: Math.abs(d),
        wallet: feePayer,
      });
    }
  }
  return out;
}
