"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { WatchlistView } from "./WatchlistView";
import { Footer } from "@/components/Footer";
import type { ScanResponse, ScanSuccess } from "@/lib/types/scan";
import { bandColor } from "@/components/terminal/TokenView";
import { HodlLogo, Icon, SolanaMark } from "@/components/terminal/Brand";
import { HeroGlobe } from "@/components/landing/HeroGlobe";

type Data = ScanSuccess["data"];
type View = "home" | "trending" | "more" | "watchlist";
type Trend = {
  rank: number;
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  marketCapUsd: number | null;
  change24h: number | null;
};

// Wrapped SOL mint (Jupiter docs).
const FEATURED = "So11111111111111111111111111111111111111112";

// Mints cross-checked against several independent public sources.
const POPULAR = [
  { symbol: "SOL", mint: FEATURED },
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

function Avatar({ url, symbol, size, fallback }: { url: string | null; symbol: string | null; size: number; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const box: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    maxWidth: size,
    flexShrink: 0,
    borderRadius: "9999px",
    overflow: "hidden",
    border: "2px solid #1f8bff",
    background: "#07101c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: size * 0.4,
  };
  const src = url && !failed ? url.replace("width=800&height=800", "width=128&height=128") : null;

  if (!src) return <div style={box}>{fallback ?? (symbol ?? "?").slice(0, 1).toUpperCase()}</div>;

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

function MiniRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const col = bandColor(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" style={{ filter: `drop-shadow(0 0 6px ${col}99)` }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(96,140,255,0.16)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${((score ?? 0) / 10) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold leading-none" style={{ fontSize: size * 0.28 }}>{score === null ? "—" : score.toFixed(1)}</span>
        <span className="mt-0.5 tracking-[0.14em] text-hodl-muted" style={{ fontSize: Math.max(size * 0.09, 6) }}>HEALTH</span>
      </div>
    </div>
  );
}

function Spark({ pool }: { pool: string | null }) {
  const [pts, setPts] = useState<number[]>([]);

  useEffect(() => {
    if (!pool) return;
    let off = false;
    (async () => {
      try {
        const r = await fetch(`/api/chart?pool=${pool}&timeframe=1h`);
        const j = await r.json();
        if (!off && Array.isArray(j.candles)) {
          setPts(j.candles.slice(-24).map((c: { close: number }) => c.close));
        }
      } catch {
        /* no sparkline */
      }
    })();
    return () => {
      off = true;
    };
  }, [pool]);

  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const span = Math.max(...pts) - min || 1;
  const xy = pts.map((v, i) => `${(i / (pts.length - 1)) * 160},${46 - ((v - min) / span) * 42}`);
  const col = pts[pts.length - 1] >= pts[0] ? "#2dd4bf" : "#fb7185";

  return (
    <svg viewBox="0 0 160 50" className="h-10 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity=".35" />
          <stop offset="1" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,50 ${xy.join(" ")} 160,50`} fill="url(#spk)" />
      <polyline points={xy.join(" ")} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function FeaturedRow({ mint, onScan }: { mint: string; onScan: (m: string) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [lastMc, setLastMc] = useState<number | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const r = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mint }),
        });
        const j: ScanResponse = await r.json();
        if (off) return;
        if ("data" in j) {
          setD(j.data);
          // Remember the last good market cap so a provider gap does not blank the card.
          const key = `hodl:mc2:${mint}`;
          const mc = j.data.market.marketCapUsd;
          try {
            if (typeof mc === "number" && Number.isFinite(mc) && mc > 0) {
              localStorage.setItem(key, JSON.stringify({ v: mc, at: Date.now() }));
            } else {
              const raw = JSON.parse(localStorage.getItem(key) ?? "null");
              if (raw && typeof raw.v === "number" && Date.now() - raw.at < 86_400_000) setLastMc(raw.v);
            }
          } catch {
            /* storage unavailable */
          }
        } else setFailed(true);
      } catch {
        if (!off) setFailed(true);
      }
    })();
    return () => {
      off = true;
    };
  }, [mint]);

  if (failed) return null;
  if (!d) return <div className="h-[92px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />;

  const m = d.market;
  const stale = m.marketCapUsd === null && lastMc !== null;
  const partial = d.health.partial || d.health.missingCritical;
  const isSol = m.symbol === "SOL";
  const price = m.priceUsd === null ? "N/A" : m.priceUsd < 1 ? m.priceUsd.toPrecision(4) : m.priceUsd.toFixed(2);

  return (
    <button
      type="button"
      onClick={() => onScan(m.mint)}
      className="grid w-full grid-cols-[minmax(0,1.15fr)_auto_minmax(0,1fr)] items-center gap-2.5 rounded-2xl border border-white/5 bg-white/[0.025] px-3 py-3 text-left"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar url={m.imageUrl ?? null} symbol={m.symbol} size={40} fallback={isSol ? <SolanaMark className="h-5 w-5" /> : undefined} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold leading-tight">{isSol ? "Solana" : (m.name ?? "Token")}</p>
          <p className="text-[10px] text-hodl-muted">${m.symbol ?? "—"}</p>
          <p className="mt-0.5 truncate text-[12px] font-semibold">${price}</p>
          <p className="text-[11px]"><Change v={m.periods.h24.priceChangePct} /> <span className="text-hodl-muted">(24h)</span></p>
        </div>
      </div>
      <div className={partial ? "opacity-60 grayscale" : ""}>
        <MiniRing score={d.health.score} size={60} />
      </div>
      <div className="min-w-0 border-l border-white/10 pl-2.5">
        <Spark pool={m.pairAddress} />
        <p className="mt-1 whitespace-nowrap text-[10px] text-hodl-muted">MC <span className="ml-1 font-bold text-slate-100">{usd(stale ? lastMc : m.marketCapUsd)}</span>{stale && <span className="ml-1 text-[9px]">last</span>}</p>
        <p className="whitespace-nowrap text-[10px] text-hodl-muted">VOL <span className="ml-1 font-bold text-slate-100">{usd(m.periods.h24.volumeUsd)}</span></p>
      </div>
    </button>
  );
}

function FeaturedList({ onScan, onViewAll }: { onScan: (m: string) => void; onViewAll: () => void }) {
  const [trendTop, setTrendTop] = useState<{ mint: string }[] | null>(null);
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const r = await fetch("/api/trending");
        const j = await r.json();
        if (off || !Array.isArray(j.items)) return;
        const top = (j.items as { mint?: unknown; rank?: number }[])
          .filter((i): i is { mint: string; rank?: number } => typeof i.mint === "string")
          .sort((x, y) => (x.rank ?? 99) - (y.rank ?? 99))
          .slice(0, 3)
          .map((i) => ({ mint: i.mint }));
        if (top.length > 0) setTrendTop(top);
      } catch {
        /* keep the fallback list */
      }
    })();
    return () => {
      off = true;
    };
  }, []);
  const picks: { mint: string }[] = trendTop ?? POPULAR.slice(0, 3);
  return (
    <section className="hodl-card p-3">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-hodl-muted">
          <Icon name="fire" className="h-4 w-4 text-hodl-cyan" /> Featured tokens
        </p>
        <button type="button" onClick={onViewAll} className="text-[11px] font-bold text-hodl-cyan">
          View all →
        </button>
      </div>
      <div className="space-y-2">
        {picks.map((p) => (
          <FeaturedRow key={p.mint} mint={p.mint} onScan={onScan} />
        ))}
      </div>
    </section>
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
        <span className="block truncate text-[15px] font-extrabold">{t.name ?? t.symbol ?? "Token"}</span>
        <span className="block text-xs text-hodl-muted">${t.symbol ?? "—"}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-bold">{usd(t.marketCapUsd)}</span>
        <span className="block text-[12px] font-bold"><Change v={t.change24h} /></span>
      </span>
      
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
  const [trend, setTrend] = useState<Trend[] | null>(null);
  const [trendFailed, setTrendFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  function goScan() {
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  async function pasteCA() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setMint(text.trim());
    } catch {
      inputRef.current?.focus();
    }
  }

  const nav: [string, string, Parameters<typeof Icon>[0]["name"]][] = [
    ["Home", "home", "home"],
    ["Trending", "trending", "fire"],
    ["Scan", "scan", "scan"],
    ["Watchlist", "watchlist", "bell"],
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
    <div className="relative pb-28">
      <header className="relative z-10 flex items-center gap-2.5">
        <HodlLogo size={38} />
        <span className="bg-gradient-to-r from-white to-hodl-cyan bg-clip-text text-xl font-extrabold tracking-[0.2em] text-transparent">
          HODL
        </span>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-hodl-line bg-black/40 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          Solana · Live
        </span>
      </header>


      {view === "home" && (
        <div className="relative z-10 mt-6 space-y-4">
          <section className="relative min-h-[150px]">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-4 -bottom-6 h-32 bg-[radial-gradient(28%_60%_at_78%_50%,rgba(31,139,255,0.3),transparent_70%)]"
            />
            <svg
              aria-hidden
              viewBox="0 0 400 60"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -left-4 -bottom-2 z-0 h-14 w-[calc(100%+2rem)]"
            >
              <defs>
                <linearGradient id="rb-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#1a2b42" /><stop offset=".5" stopColor="#0a111b" /><stop offset="1" stopColor="#03050a" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="rb-line" x1="0" y1="0" x2="1" y2="0">
                  <stop stopColor="#38d6ff" stopOpacity="0" />
                  <stop offset=".35" stopColor="#38d6ff" stopOpacity=".12" />
                  <stop offset=".7" stopColor="#38d6ff" stopOpacity=".38" />
                  <stop offset="1" stopColor="#38d6ff" stopOpacity=".38" />
                </linearGradient>
                <linearGradient id="rb-mask-g" x1="0" y1="0" x2="1" y2="0">
                  <stop stopColor="#fff" stopOpacity="0" />
                  <stop offset=".4" stopColor="#fff" stopOpacity=".35" />
                  <stop offset=".72" stopColor="#fff" stopOpacity="1" />
                </linearGradient>
                <mask id="rb-mask">
                  <rect width="400" height="60" fill="url(#rb-mask-g)" />
                </mask>
              </defs>
              <path d="M0 40L60 39L110 37L170 34L220 33L255 28L280 31L305 25L330 29L360 21L385 27L400 25V60H0Z" fill="url(#rb-fill)" mask="url(#rb-mask)" />
              <path d="M0 40L60 39L110 37L170 34L220 33L255 28L280 31L305 25L330 29L360 21L385 27L400 25" fill="none" stroke="url(#rb-line)" strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              
            </svg>
            <div className="pointer-events-none absolute -top-3 right-0 z-0 w-[150px]">
              <HeroGlobe />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-hodl-muted">Token Surveillance</p>
              <h1 className="mt-3 text-[clamp(21px,6.2vw,25px)] font-black uppercase leading-[1.08] tracking-[0.06em]">
                {["Health", "Observe", "Detect", "Live"].map((w) => (
                  <span key={w} className="block">
                    <span className="bg-gradient-to-r from-hodl-cyan via-hodl-blue to-violet-400 bg-clip-text text-transparent">
                      {w[0]}
                    </span>
                    <span className="text-white/90">{w.slice(1)}</span>
                  </span>
                ))}
              </h1>
              <p className="mt-6 max-w-[340px] text-[13.5px] leading-snug text-slate-300/85">
                Paste a token CA and get an explainable Health score, live data and alerts in one place.
              </p>
            </div>
          </section>

          <div>
            <div className="rounded-[20px] bg-gradient-to-r from-hodl-blue via-hodl-cyan to-hodl-green p-[1.5px] shadow-[0_0_26px_rgba(31,139,255,0.3)]">
              <div className="rounded-[19px] bg-[#05080e] p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onScan(mint);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5">
                    <Icon name="link" className="h-4 w-4 shrink-0 text-hodl-cyan" />
                    <input
                      suppressHydrationWarning
                      ref={inputRef}
                      type="text"
                      value={mint}
                      onChange={(e) => setMint(e.target.value)}
                      placeholder="Solana mint address / CA"
                      className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] font-medium outline-none placeholder:text-slate-500"
                    />
                    {mint ? (
                      <button type="button" onClick={() => setMint("")} aria-label="Clear" className="px-1 text-lg leading-none text-hodl-muted">
                        ×
                      </button>
                    ) : (
                      <button type="button" onClick={pasteCA} className="rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-200">
                        Paste
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-hodl-blue to-blue-500 px-4 py-2.5 text-[14px] font-extrabold shadow-lg shadow-black/60 disabled:opacity-60"
                  >
                    <Icon name="bolt" className="h-4 w-4" />
                    {loading ? "Scanning…" : "Scan"}
                  </button>
                </form>
                <div className="mt-2 grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 pb-0.5 pt-2.5 text-center text-[10px] text-slate-300">
                  {([["Price & Chart", "chart"], ["Risk Analysis", "shield"], ["Identity Check", "people"], ["Live Alerts", "bell"]] as [string, Parameters<typeof Icon>[0]["name"]][]).map(([label, ic]) => (
                    <span key={label} className="flex flex-col items-center gap-1">
                      <Icon name={ic} className="h-4 w-4 text-hodl-cyan" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-slate-500">Solana only · no wallet connection needed</p>
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <FeaturedList onScan={onScan} onViewAll={() => setView("trending")} />

          <section className="hodl-card flex items-center gap-3 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hodl-line bg-black/40 text-hodl-cyan">
              <Icon name="scan" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-hodl-muted">Why HODL?</p>
              <p className="text-[15px] font-extrabold leading-tight">You trade. HODL watches.</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Real data, not hope.</p>
            </div>
            <button type="button" onClick={() => setView("more")} className="shrink-0 whitespace-nowrap rounded-full border border-hodl-cyan/60 px-3.5 py-2 text-[11px] font-bold text-hodl-cyan">
              Learn more →
            </button>
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

      {view === "watchlist" && <WatchlistView onScan={onScan} />}

      {view === "more" && (
        <section className="hodl-card mt-6 space-y-3 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-muted">About HODL</p>
          <p>HODL watches, you decide. No trading, no wallet connection, no buy or sell calls.</p>
          <p className="text-hodl-muted">Unavailable data shows as N/A. HODL never guesses.</p>
          <div className="divide-y divide-white/10 text-xs">
            <p className="flex justify-between py-2"><span className="text-hodl-muted">Health model</span><span>v0.1.2</span></p>
            <p className="flex justify-between py-2"><span className="text-hodl-muted">Watch, Observe, Alerts</span><span>v0.2</span></p>
          </div>
        </section>
      )}

      <Footer />

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-hodl-line bg-[#05080e]/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-5">
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
