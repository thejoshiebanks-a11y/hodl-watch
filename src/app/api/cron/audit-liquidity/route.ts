import { NextResponse } from "next/server";
import { SolanaMintSchema } from "@/lib/validation/solana";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX = 8;
const UA = "Mozilla/5.0 (compatible; HODL/0.3; +https://hodlterminal.vercel.app)";

type Rec = Record<string, unknown>;

const rec = (x: unknown): Rec | null =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Rec) : null;

const num = (x: unknown): number | null => {
  const n = typeof x === "string" ? Number(x) : x;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

const fmt = (n: number | null) => (n === null ? "null" : String(Math.round(n)));

async function getJson(url: string): Promise<{ status: number; json: unknown }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    const json: unknown = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

type DexTop = {
  dexId: string | null;
  liquidityField: boolean;
  liquidityUsd: number | null;
  marketCap: number | null;
  ageMin: number | null;
};

async function dex(mint: string): Promise<{ status: number; top: DexTop | null }> {
  const { status, json } = await getJson(
    `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
  );
  const raw = rec(json)?.pairs;
  const pairs = (Array.isArray(raw) ? raw : [])
    .map(rec)
    .filter((p): p is Rec => p !== null && p.chainId === "solana");
  const vol = (p: Rec) => num(rec(p.volume)?.h24) ?? 0;
  const top = [...pairs].sort((a, b) => vol(b) - vol(a))[0];
  if (!top) return { status, top: null };
  const created = num(top.pairCreatedAt);
  return {
    status,
    top: {
      dexId: typeof top.dexId === "string" ? top.dexId : null,
      liquidityField: rec(top.liquidity) !== null,
      liquidityUsd: num(rec(top.liquidity)?.usd),
      marketCap: num(top.marketCap),
      ageMin: created === null ? null : Math.round((Date.now() - created) / 60_000),
    },
  };
}

async function gecko(mint: string): Promise<{ status: number; reserveUsd: number | null }> {
  const { status, json } = await getJson(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`,
  );
  const data = rec(json)?.data;
  const reserves = (Array.isArray(data) ? data : [])
    .map((p) => num(rec(rec(p)?.attributes)?.reserve_in_usd))
    .filter((n): n is number => n !== null);
  return { status, reserveUsd: reserves.length ? Math.max(...reserves) : null };
}

async function rugcheck(mint: string): Promise<{ status: number; liquidity: number | null }> {
  const { status, json } = await getJson(
    `https://api.rugcheck.xyz/v1/tokens/${mint}/report`,
  );
  return { status, liquidity: num(rec(json)?.totalMarketLiquidity) };
}

const blocked = (s: number) => s === 0 || s === 403 || s === 429 || s >= 500;

function verdict(
  hasPair: boolean,
  dl: number | null,
  gl: number | null,
  rl: number | null,
  statuses: number[],
): string {
  const failing = statuses.some(blocked);
  if (!hasPair) return failing ? "INCONCLUSIVE" : "NO_DEX_PAIR";
  if ((dl ?? 0) > 0) return "DEX_OK";
  if ((gl ?? 0) > 0) return "PROVIDER_GAP";
  if ((rl ?? 0) > 0) return "RUGCHECK_ONLY";
  return failing ? "INCONCLUSIVE" : "NONE_ANYWHERE";
}

async function newMints(): Promise<string[]> {
  const { json } = await getJson("https://api.rugcheck.xyz/v1/stats/new_tokens");
  return (Array.isArray(json) ? json : [])
    .map((x) => rec(x)?.mint)
    .filter((m): m is string => typeof m === "string");
}

async function profileMints(): Promise<string[]> {
  const { json } = await getJson("https://api.dexscreener.com/token-profiles/latest/v1");
  return (Array.isArray(json) ? json : [])
    .map(rec)
    .filter((x): x is Rec => x !== null && x.chainId === "solana")
    .map((x) => x.tokenAddress)
    .filter((m): m is string => typeof m === "string");
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const source = params.get("source");
  const raw =
    source === "new"
      ? await newMints()
      : source === "profiles"
        ? await profileMints()
        : (params.get("mints") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const mints: string[] = [];
  for (const m of raw) {
    const p = SolanaMintSchema.safeParse(m);
    if (p.success && !mints.includes(p.data)) mints.push(p.data);
    if (mints.length >= MAX) break;
  }
  if (mints.length === 0) {
    return new Response("no valid mints. Use ?mints=a,b or ?source=new or ?source=profiles\n", {
      status: 400,
    });
  }

  const lines: string[] = [];
  const counts: Record<string, number> = {};

  for (const mint of mints) {
    const [d, g, r] = await Promise.all([dex(mint), gecko(mint), rugcheck(mint)]);
    const v = verdict(
      d.top !== null,
      d.top?.liquidityUsd ?? null,
      g.reserveUsd,
      r.liquidity,
      [d.status, g.status, r.status],
    );
    counts[v] = (counts[v] ?? 0) + 1;
    lines.push(
      `${mint.slice(0, 6)} ${v} | dex ${d.top?.dexId ?? "-"} liq=${fmt(d.top?.liquidityUsd ?? null)}` +
        `${d.top && !d.top.liquidityField ? "(no field)" : ""} mc=${fmt(d.top?.marketCap ?? null)} ` +
        `age=${d.top?.ageMin ?? "-"}m | gecko=${fmt(g.reserveUsd)} | rug=${fmt(r.liquidity)} | ` +
        `http ${d.status}/${g.status}/${r.status}`,
    );
  }

  const summary = Object.entries(counts).map(([k, n]) => `${k}=${n}`).join("  ");
  return new Response(`${lines.join("\n")}\n\n${summary}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
