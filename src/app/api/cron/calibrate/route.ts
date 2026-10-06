import { NextResponse } from "next/server";
import { getRedis } from "@/lib/watch/redis";
import { runScan } from "@/lib/scan/run";
import { toSnapshot } from "@/lib/watch/snapshot";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { labelOutcome, summarize, type CalibRecord } from "@/lib/calibration/logic";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const KEY = "calib:records";
const MAX_RECORDS = 500;
const MAX_PER_CALL = 25;
const CONCURRENCY = 4;
const DEADLINE_MS = 50_000;
const DEDUPE_MS = 12 * 3600_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One retry, so a provider hiccup is less likely to be recorded as "gone".
async function scanWithRetry(mint: string) {
  let out = await runScan(mint);
  if (!out.ok) {
    await sleep(1000);
    out = await runScan(mint);
  }
  return out;
}

async function pool<T>(items: T[], started: number, fn: (x: T) => Promise<void>) {
  let next = 0;

  async function worker() {
    while (next < items.length && Date.now() - started < DEADLINE_MS) {
      await fn(items[next++]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

async function fetchProfiles(): Promise<string[]> {
  try {
    const res = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return [];
    return json
      .filter(
        (x): x is { chainId: string; tokenAddress: string } =>
          x?.chainId === "solana" && typeof x?.tokenAddress === "string",
      )
      .map((x) => x.tokenAddress);
  } catch {
    return [];
  }
}

async function doRecord(params: URLSearchParams, started: number) {
  const redis = getRedis();
  const existing = (await redis.hgetall<Record<string, CalibRecord>>(KEY)) ?? {};
  const all = Object.values(existing);

  if (all.length >= MAX_RECORDS) return { error: "record_limit_reached" };

  const list = params.get("mints");
  const raw = list
    ? list.split(",").map((s) => s.trim()).filter(Boolean)
    : params.get("source") === "profiles"
      ? await fetchProfiles()
      : [];
  if (raw.length === 0) {
    return { error: "no_mints", hint: "Use mints=a,b,c or source=profiles" };
  }

  const recent = new Set(
    all.filter((r) => Date.now() - Date.parse(r.at) < DEDUPE_MS).map((r) => r.mint),
  );
  const clean: string[] = [];
  for (const m of raw) {
    const p = SolanaMintSchema.safeParse(m);
    if (p.success && !recent.has(p.data) && !clean.includes(p.data)) clean.push(p.data);
    if (clean.length >= MAX_PER_CALL) break;
  }

  let recorded = 0;
  let skipped = 0;
  await pool(clean, started, async (mint) => {
    try {
      const out = await scanWithRetry(mint);
      if (!out.ok) {
        skipped++;
        return;
      }
      const s = toSnapshot(out.data);

      const rec: CalibRecord = {
        id: `${mint}-${Date.now()}`,
        mint,
        symbol: s.symbol,
        at: s.at,
        health: s.health,
        partial: s.partial,
        coverage: out.data.health.coverage,
        domains: s.domains,
        priceUsd: s.priceUsd,
        liquidityUsd: s.liquidityUsd,
      };
      await redis.hset(KEY, { [rec.id]: rec });
      recorded++;
    } catch {
      skipped++;
    }
  });

  return { candidates: raw.length, tried: clean.length, recorded, skipped };
}

async function doResolve(params: URLSearchParams, started: number) {
  const redis = getRedis();
  const all = Object.values(
    (await redis.hgetall<Record<string, CalibRecord>>(KEY)) ?? {},
  );

  const raw = params.get("hours");
  const parsed = raw === null ? 24 : Number(raw);
  const hours = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 168) : 24;

  const due = all
    .filter((r) => !r.outcome && Date.now() - Date.parse(r.at) >= hours * 3600_000)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, MAX_PER_CALL);

  let resolved = 0;
  await pool(due, started, async (r) => {
    try {
      const out = await scanWithRetry(r.mint);
      const after = out.ok ? toSnapshot(out.data) : null;
      const o = labelOutcome(
        { priceUsd: r.priceUsd, liquidityUsd: r.liquidityUsd },
        after ? { priceUsd: after.priceUsd, liquidityUsd: after.liquidityUsd } : null,
      );
      await redis.hset(KEY, {
        [r.id]: { ...r, outcome: { at: new Date().toISOString(), ...o } },
      });
      resolved++;
    } catch {
      // leave it pending; the next run retries
    }
  });

  return { waitingHours: hours, due: due.length, resolved };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const params = new URL(request.url).searchParams;
  const action = params.get("action") ?? "report";

  try {
    let body: object;
    if (action === "record") body = await doRecord(params, started);
    else if (action === "resolve") body = await doResolve(params, started);
    else if (action === "report") {
      const all = Object.values(
        (await getRedis().hgetall<Record<string, CalibRecord>>(KEY)) ?? {},
      );
      body = summarize(all);
    } else if (action === "clear") {
      await getRedis().del(KEY);
      body = { cleared: true };
    } else {
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
    return NextResponse.json(body, { status: "error" in body ? 400 : 200 });
  } catch (e) {
    console.error("calibrate failed:", e);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
