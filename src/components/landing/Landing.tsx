"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ScanResponse, ScanSuccess } from "@/lib/types/scan";
import { summarizeHealthGroups } from "@/health/score/groups";
import { bandColor, riskRows } from "@/components/terminal/TokenView";
import { HodlLogo, Icon, SolanaMark } from "@/components/terminal/Brand";

type Data = ScanSuccess["data"];
type View = "home" | "trending" | "more";
type Trend = {
  rank: number;
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  marketCapUsd: number | null;
  change24h: number | null;
};

// Mints cross-checked against several independent public sources.
const POPULAR = [
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "POPCAT", mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr" },
];

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usd = (v: number | null | undefined) =>
  v === null || v === undefined ? "N/A" : `$${compact.format(v)}`;

function Change({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span className="text-hodl-muted">N/A</span>;
  return (
    <span className={v >= 0 ? "text-emerald-300" : "text-rose-300"}>
      {v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function Avatar({ url, symbol, size }: { url: string | null; symbol: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const box: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    maxWidth: size,
    flexShrink: 0,
    borderRadius: "9999px",
    overflow: "hidden",
    border: "2px solid #2f5bff",
    background: "#0b1642",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: size * 0.4,
  };
  const src = url && !failed ? url.replace("width=800&height=800", "width=128&height=128") : null;

  if (!src) return <div style={box}>{(symbol ?? "?").slice(0, 1).toUpperCase()}</div>;

  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function MiniRing({ score }: { score: number | null }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const col = bandColor(score);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" style={{ filter: `drop-shadow(0 0 6px ${col}99)` }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(96,140,255,0.16)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${((score ?? 0) / 10) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score === null ? "—" : score.toFixed(1)}</span>
        <span className="text-[8px] tracking-[0.14em] text-hodl-muted">HEALTH</span>
      </div>
    </div>
  );
}

function Featured({ d, onScan }: { d: Data; onScan: (m: string) => void }) {
  const m = d.market;
  const liq = summarizeHealthGroups(d.factors).find((g) => g.group === "LIQUIDITY")?.score ?? null;
  const rows = riskRows(d);
  const risk = rows.some((r) => r[2] === "bad")
    ? "High"
    : rows.some((r) => r[2] === "mid")
      ? "Moderate"
      : rows.every((r) => r[2] === "na")
        ? "N/A"
        : "Low";
  const lp = d.identity.lpLockedPctWeighted;

  const stats: [string, string, string][] = [
    ["Liquidity", usd(m.liquidityUsd), liq === null ? "" : liq >= 7 ? "Strong" : liq >= 4 ? "Moderate" : "Thin"],
    ["Holders", d.identity.holderCount === null ? "N/A" : compact.format(d.identity.holderCount), ""],
    ["LP locked", lp === null ? "N/A" : `${lp.toFixed(0)}%`, "weighted"],
    ["Risk", risk, "3 checks"],
  ];

  return (
    <button type="button" onClick={() => onScan(m.mint)} className="hodl-card w-full p-4 text-left">
      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
        ★ Featured token
      </span>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar url={m.imageUrl ?? null} symbol={m.symbol} size={56} />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{m.name ?? "Token"}</p>
            <p className="text-xs text-hodl-muted">${m.symbol ?? "—"}</p>
            <p className="mt-1 text-sm font-semibold">
              ${m.priceUsd === null ? "N/A" : m.priceUsd < 1 ? m.priceUsd.toPrecision(4) : m.priceUsd.toFixed(2)}
            </p>
            <p className="text-xs"><Change v={m.periods.h24.priceChangePct} /> <span className="text-hodl-muted">(24h)</span></p>
          </div>
        </div>
        <MiniRing score={d.health.score} />
      </div>
      <div className="mt-4 grid grid-cols-4 divide-x divide-white/10 rounded-xl border border-white/10 bg-black/20 py-2.5">
        {stats.map(([k, v, sub]) => (
          <div key={k} className="px-2.5">
            <p className="text-[9px] uppercase tracking-[0.08em] text-hodl-muted">{k}</p>
            <p className="mt-0.5 text-sm font-bold">{v}</p>
            <p className="text-[10px] text-hodl-cyan">{sub || "\u00a0"}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

function TrendRow({ t, onScan }: { t: Trend; onScan: (m: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onScan(t.mint)}
      className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-0"
    >
      <span className="w-4 text-sm text-hodl-muted">{t.rank}</span>
      <Avatar url={t.imageUrl} symbol={t.symbol} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{t.name ?? t.symbol ?? "Token"}</span>
        <span className="block text-xs text-hodl-muted">${t.symbol ?? "—"}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold">{usd(t.marketCapUsd)}</span>
        <span className="block text-[10px] text-hodl-muted">MCap</span>
      </span>
      <span className="w-16 text-right text-xs"><Change v={t.change24h} /></span>
      <Icon name="chevron" className="h-4 w-4 text-hodl-muted" />
    </button>
  );
}

export function Landing({
  mint,
  setMint,
  onScan,
  loading,
  error,
}: {
  mint: string;
  setMint: (v: string) => void;
  onScan: (v: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [view, setView] = useState<View>("home");
  const [featured, setFeatured] = useState<Data | null>(null);
  const [trend, setTrend] = useState<Trend[] | null>(null);
  const [trendFailed, setTrendFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const r = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mint: POPULAR[0].mint }),
        });
        const j: ScanResponse = await r.json();
        if (!off && "data" in j) setFeatured(j.data);
      } catch {
        /* featured card simply stays hidden */
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const r = await fetch("/api/trending");
        const j = await r.json();
        if (off) return;
        if (Array.isArray(j.items)) setTrend(j.items as Trend[]);
        else setTrendFailed(true);
      } catch {
        if (!off) setTrendFailed(true);
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  const chips = [
    ...POPULAR.map((p) => ({ label: p.symbol, mint: p.mint })),
    ...(trend?.[0] ? [{ label: `#1 ${trend[0].symbol ?? "trending"}`, mint: trend[0].mint }] : []),
  ];

  function goScan() {
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  const nav: [string, string, Parameters<typeof Icon>[0]["name"]][] = [
    ["Home", "home", "home"],
    ["Trending", "trending", "fire"],
    ["Scan", "scan", "scan"],
    ["More", "more", "dots"],
  ];

  function onNav(key: string) {
    if (key === "scan") goScan();
    else setView(key as View);
  }

  const trendList = (rows: Trend[]) => (
    <div className="hodl-card overflow-hidden">
      {rows.map((t) => (
        <TrendRow key={t.mint} t={t} onScan={onScan} />
      ))}
    </div>
  );

  return (
    <div className="pb-28">
      <header className="flex items-center gap-2.5">
        <HodlLogo size={38} />
        <span className="bg-gradient-to-r from-white to-hodl-cyan bg-clip-text text-xl font-extrabold tracking-[0.2em] text-transparent">
          HODL
        </span>
      </header>

      {view === "home" && (
        <div className="mt-6 space-y-5">
          <section className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live · Solana
            </span>
            <h1 className="mt-4 text-[42px] font-extrabold leading-[1.05]">
              Real-Time
              <br />
              <span className="bg-gradient-to-r from-hodl-cyan via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Token Intelligence
              </span>
            </h1>
            <p className="mt-3 max-w-[260px] text-sm text-hodl-muted">
              Scan any Solana token and get an explainable Health score, the chart and the evidence behind it.
            </p>
            <div className="pointer-events-none absolute -right-6 top-6 h-32 w-32" aria-hidden>
              <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b8cff,#2a1a8f_55%,#0a0f3a)] shadow-[0_0_50px_rgba(79,110,255,0.6)]" />
              <div className="absolute inset-0 rounded-full border border-hodl-cyan/40 [transform:rotateX(70deg)_rotate(-20deg)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <SolanaMark className="h-11 w-11" />
              </div>
            </div>
          </section>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onScan(mint);
            }}
            className="hodl-card flex items-center gap-2 p-2"
          >
            <Icon name="link" className="ml-2 h-5 w-5 shrink-0 text-hodl-muted" />
            <input
              suppressHydrationWarning
              ref={inputRef}
              type="text"
              value={mint}
              onChange={(e) => setMint(e.target.value)}
              placeholder="Paste Solana mint address (CA)…"
              className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none placeholder:text-hodl-muted"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-hodl-blue to-blue-500 px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-900/40 disabled:opacity-60"
            >
              <Icon name="bolt" className="h-4 w-4" />
              {loading ? "Scanning…" : "Scan"}
            </button>
          </form>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-xs text-hodl-muted">Try</span>
            {chips.map((c) => (
              <button
                key={c.mint}
                type="button"
                onClick={() => {
                  setMint(c.mint);
                  onScan(c.mint);
                }}
                className="shrink-0 whitespace-nowrap rounded-full border border-hodl-line bg-white/5 px-3.5 py-2 text-xs font-semibold"
              >
                {c.label}
              </button>
            ))}
          </div>

          {featured && <Featured d={featured} onScan={onScan} />}

          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="flex items-center gap-2 text-base font-bold">
                <Icon name="fire" className="h-5 w-5 text-orange-400" /> Trending Now
              </p>
              {trend && (
                <button type="button" onClick={() => setView("trending")} className="text-xs text-hodl-cyan">
                  View all →
                </button>
              )}
            </div>
            {trend ? (
              trendList(trend.slice(0, 5))
            ) : (
              <p className="hodl-card px-4 py-6 text-center text-xs text-hodl-muted">
                {trendFailed ? "Trending is unavailable right now." : "Loading trending tokens…"}
              </p>
            )}
            <p className="mt-2 px-1 text-[10px] text-hodl-muted">Trending pools via GeckoTerminal. Not a recommendation.</p>
          </section>

          <section className="hodl-card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hodl-blue/25 text-hodl-cyan">
              <Icon name="bolt" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Hours of research, in seconds.</p>
              <p className="text-xs text-hodl-muted">HODL watches. You decide.</p>
            </div>
          </section>
        </div>
      )}

      {view === "trending" && (
        <section className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-xl font-bold">
            <Icon name="fire" className="h-6 w-6 text-orange-400" /> Trending on Solana
          </p>
          {trend ? (
            trendList(trend)
          ) : (
            <p className="hodl-card px-4 py-6 text-center text-xs text-hodl-muted">
              {trendFailed ? "Trending is unavailable right now." : "Loading…"}
            </p>
          )}
        </section>
      )}

      {view === "more" && (
        <section className="hodl-card mt-6 space-y-3 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-muted">About HODL</p>
          <p>HODL watches, you decide. No trading, no wallet connection, no buy or sell calls.</p>
          <p className="text-hodl-muted">Unavailable data shows as N/A. HODL never guesses.</p>
          <div className="divide-y divide-white/10 text-xs">
            <p className="flex justify-between py-2"><span className="text-hodl-muted">Health model</span><span>v0.1.1</span></p>
            <p className="flex justify-between py-2"><span className="text-hodl-muted">Watch, Observe, Alerts</span><span>v0.2</span></p>
          </div>
        </section>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-hodl-line bg-[#050b24]/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-4">
          {nav.map(([label, key, ic]) => (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${key === view ? "text-hodl-cyan" : "text-hodl-muted"}`}
            >
              <Icon name={ic} className="h-5 w-5" />
              {label}
              <span className={`h-0.5 w-8 rounded-full ${key === view ? "bg-hodl-cyan shadow-[0_0_8px_#38d6ff]" : "bg-transparent"}`} />
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
