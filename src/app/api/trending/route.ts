import { NextResponse } from "next/server";

type Item = {
  rank: number;
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  marketCapUsd: number | null;
  change24h: number | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

const FRESH_MS = 60_000;
const STALE_MS = 15 * 60_000;
const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

let cache: { at: number; items: Item[] } | null = null;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const pos = (v: unknown) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

export async function GET() {
  if (cache && Date.now() - cache.at < FRESH_MS) {
    return NextResponse.json({ items: cache.items });
  }

  const fallback = () =>
    cache && Date.now() - cache.at < STALE_MS
      ? NextResponse.json({ items: cache.items, stale: true })
      : NextResponse.json({ error: "upstream_unavailable" }, { status: 502 });

  try {
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token&page=1",
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return fallback();

    const json: Rec = await response.json();
    const tokens = new Map<string, Rec>();
    for (const t of (json.included ?? []) as Rec[]) {
      if (t?.id) tokens.set(t.id, t.attributes ?? {});
    }

    const seen = new Set<string>();
    const items: Item[] = [];

    for (const p of (json.data ?? []) as Rec[]) {
      const a: Rec = p.attributes ?? {};
      const id = p.relationships?.base_token?.data?.id as string | undefined;
      const t = id ? tokens.get(id) : undefined;
      const mint = (t?.address ?? id?.replace(/^solana_/, "")) as string | undefined;

      if (!mint || !MINT.test(mint) || seen.has(mint)) continue;
      seen.add(mint);

      const image = typeof t?.image_url === "string" ? t.image_url : null;

      items.push({
        rank: items.length + 1,
        mint,
        name: t?.name ?? null,
        symbol: t?.symbol ?? null,
        imageUrl: image && image.startsWith("http") ? image : null,
        marketCapUsd: pos(a.market_cap_usd) ?? pos(a.fdv_usd),
        change24h: num(a.price_change_percentage?.h24),
      });

      if (items.length >= 15) break;
    }

    if (items.length === 0) return fallback();

    cache = { at: Date.now(), items };
    return NextResponse.json({ items });
  } catch {
    return fallback();
  }
}
