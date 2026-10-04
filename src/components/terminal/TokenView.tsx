"use client";

import { useState, type CSSProperties } from "react";
import type { ScanSuccess } from "@/lib/types/scan";
import { summarizeHealthGroups } from "@/health/score/groups";
import { PriceChart } from "@/components/PriceChart";
import { DetailTabs } from "@/components/terminal/Panels";
import { Evidence, Watch } from "@/components/terminal/Extras";
import { HodlLogo, Icon, SolanaMark } from "@/components/terminal/Brand";

type Data = ScanSuccess["data"];
type Tone = "ok" | "mid" | "bad" | "na";
type View = "overview" | "chart" | "evidence" | "watch";

const NA = "N/A";
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usd = (v: number | null) => (v === null ? NA : `$${compact.format(v)}`);
const pct = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? NA : `${v.toFixed(d)}%`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function price(p: number | null) {
  if (p === null || p <= 0) return NA;
  return p >= 1 ? p.toFixed(2) : p.toFixed(Math.min(10, Math.ceil(-Math.log10(p)) + 3));
}

// Display bands only. They do not change the Health score.
export function band(s: number | null) {
  if (s === null) return "UNSCORED";
  return s >= 7.5 ? "HEALTHY" : s >= 5.5 ? "MIXED" : s >= 3.5 ? "WEAK" : "POOR";
}

export const bandColor = (s: number | null) =>
  s === null ? "#64748b" : s >= 7.5 ? "#2dd4bf" : s >= 5.5 ? "#fbbf24" : "#fb7185";

const dot: Record<Tone, string> = {
  ok: "bg-emerald-400",
  mid: "bg-amber-400",
  bad: "bg-red-400",
  na: "bg-zinc-500",
};

export function riskRows(d: Data): [string, string, Tone][] {
  const i = d.identity;
  const liq = summarizeHealthGroups(d.factors).find((g) => g.group === "LIQUIDITY")?.score ?? null;
  const top = i.topHolderPctExcludingKnown ?? i.topHolderPct;
  const unknown = i.mintAuthority === "UNKNOWN" || i.freezeAuthority === "UNKNOWN";
  const revoked = i.mintAuthority === "REVOKED" && i.freezeAuthority === "REVOKED";

  return [
    [
      "Liquidity depth",
      liq === null ? NA : liq >= 7 ? "Good" : liq >= 4 ? "Moderate" : "Weak",
      liq === null ? "na" : liq >= 7 ? "ok" : liq >= 4 ? "mid" : "bad",
    ],
    [
      "Holder concentration",
      top === null ? NA : top <= 5 ? "Good" : top <= 15 ? "Moderate" : "High",
      top === null ? "na" : top <= 5 ? "ok" : top <= 15 ? "mid" : "bad",
    ],
    [
      "Contract checks",
      unknown ? "Unknown" : revoked ? "Passed" : "Review",
      unknown ? "na" : revoked ? "ok" : "mid",
    ],
  ];
}

function Ring({ score }: { score: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const col = bandColor(score);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
        style={{ filter: `drop-shadow(0 0 7px ${col}99)` }}
      >
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(96,140,255,0.16)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${((score ?? 0) / 10) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{score === null ? "—" : score.toFixed(1)}</span>
        <span className="text-xs text-hodl-muted">/10</span>
      </div>
    </div>
  );
}

function Avatar({ urls, symbol }: { urls: string[]; symbol: string | null }) {
  const [idx, setIdx] = useState(0);
  const size = 64;

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
    boxShadow: "0 0 24px rgba(47,91,255,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const src = urls[idx]?.replace("width=800&height=800", "width=128&height=128");

  if (!src) {
    return (
      <div style={box} className="text-2xl font-bold">
        {(symbol ?? "?").slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setIdx(idx + 1)}
      />
    </div>
  );
}

export function TokenView({ d, onBack }: { d: Data; onBack: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [copied, setCopied] = useState(false);
  const m = d.market;
  const i = d.identity;
  const score = d.health.score;
  const ch = m.periods.m5.priceChangePct;
  const h1 = m.periods.h1;
  const seen = d.factors.filter((f) => f.status === "AVAILABLE").length;
  const rows = riskRows(d);

  const worst: [string, string] = rows.some((r) => r[2] === "bad")
    ? ["High", "text-red-300"]
    : rows.some((r) => r[2] === "mid")
      ? ["Moderate", "text-amber-300"]
      : rows.every((r) => r[2] === "na")
        ? [NA, "text-hodl-muted"]
        : ["Low", "text-emerald-300"];

  const urls = [
    m.imageUrl ?? "",
    `https://dd.dexscreener.com/ds-data/tokens/solana/${m.mint}.png`,
  ].filter(Boolean);

  const stats: [Parameters<typeof Icon>[0]["name"], string, string][] = [
    ["coins", "Market cap", usd(m.marketCapUsd)],
    ["drop", "Liquidity", usd(m.liquidityUsd)],
    ["bars", "24h vol", usd(m.periods.h24.volumeUsd)],
    ["people", "Holders", !i.holderCount ? NA : i.holderCount.toLocaleString("en-US")],
  ];

  const signals: [Parameters<typeof Icon>[0]["name"], string, string, string][] = [
    ["flow", "Flow (1h)", h1.buys === null || h1.sells === null ? NA : `${h1.buys}/${h1.sells}`, "Buys / sells"],
    ["lock", "LP locked", pct(i.lpLockedPctWeighted), "Across pools"],
    ["eye", "Insiders", pct(i.insiderSupplyPct), "Of supply"],
  ];

  const nav: [View, string, Parameters<typeof Icon>[0]["name"]][] = [
    ["overview", "Overview", "compass"],
    ["chart", "Chart", "chart"],
    ["evidence", "Evidence", "shield"],
    ["watch", "Watch", "bell"],
  ];

  function copy() {
    navigator.clipboard?.writeText(m.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="pb-28">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} aria-label="Back" className="p-2 text-2xl text-hodl-muted">
          ‹
        </button>
        <div className="flex items-center gap-2.5">
          <HodlLogo size={36} />
          <span className="bg-gradient-to-r from-white to-hodl-cyan bg-clip-text text-lg font-extrabold tracking-[0.2em] text-transparent">
            HODL
          </span>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Solana · Live
        </span>
      </header>

      <section className="mt-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar urls={urls} symbol={m.symbol} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-xl font-bold">
              {m.name ?? "Token"}
              {i.jupVerified === true && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Icon name="check" className="h-3 w-3" />
                </span>
              )}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-hodl-muted">
              ${m.symbol ?? "—"} <SolanaMark />
            </p>
            <button
              type="button"
              onClick={copy}
              className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-hodl-line bg-white/5 px-3 py-1 text-[11px] text-hodl-muted"
            >
              {copied ? "Copied" : short(m.mint)}
              <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-hodl-muted">Price</p>
          <p className="hodl-glow text-[26px] font-extrabold leading-tight">${price(m.priceUsd)}</p>
          <p className={`text-sm font-semibold ${ch === null ? "text-hodl-muted" : ch >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {ch === null ? NA : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`} (5m)
          </p>
        </div>
      </section>

      <div className="mt-5 space-y-4">
        {(view === "overview" || view === "chart") && <PriceChart pool={m.pairAddress} />}

        {view === "overview" && (
          <>
            <section className="hodl-card grid grid-cols-4 divide-x divide-white/10">
              {stats.map(([ic, k, v]) => (
                <div key={k} className="min-w-0 px-3 py-4">
                  <Icon name={ic} className="h-5 w-5 text-hodl-blue" />
                  <p className="mt-2 whitespace-nowrap text-[9px] uppercase tracking-[0.1em] text-hodl-muted">{k}</p>
                  <p className="mt-0.5 whitespace-nowrap text-[15px] font-bold">{v}</p>
                </div>
              ))}
            </section>

            <section className="hodl-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-muted">
                Token health score
              </p>
              <div className="mt-3 flex items-center gap-4">
                <Ring score={score} />
                <div>
                  <p className="text-xl font-extrabold tracking-wide" style={{ color: bandColor(score) }}>
                    {band(score)}
                  </p>
                  <p className="mt-1 text-xs text-hodl-muted">
                    Health v0.1.1 · {seen}/{d.factors.length} checks observed
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3">
                <div className="flex items-center justify-between border-b border-white/10 py-2.5 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-xs text-amber-300">!</span>
                    Risk: <span className={worst[1]}>{worst[0]}</span>
                  </span>
                </div>
                {rows.map(([k, v, t]) => (
                  <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-hodl-muted">
                      <span className={`h-2 w-2 rounded-full ${dot[t]}`} />
                      {k}
                    </span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="hodl-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-muted">
                  On-chain signals
                </p>
                <span className="flex items-center gap-1.5 rounded-full border border-hodl-line px-2.5 py-0.5 text-[10px] text-hodl-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-hodl-cyan" />
                  Snapshot
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-white/10">
                {signals.map(([ic, k, v, sub]) => (
                  <div key={k} className="px-3 first:pl-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-hodl-blue/20 text-hodl-cyan shadow-[0_0_14px_rgba(56,214,255,0.25)]">
                      <Icon name={ic} className="h-[18px] w-[18px]" />
                    </span>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-hodl-muted">{k}</p>
                    <p className="text-xl font-extrabold text-hodl-cyan">{v}</p>
                    <p className="text-[11px] text-hodl-muted">{sub}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-muted">Intel</p>
              <DetailTabs d={d} />
            </section>
          </>
        )}

        {view === "evidence" && <Evidence d={d} />}
        {view === "watch" && <Watch d={d} />}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-hodl-line bg-[#050b24]/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-4">
          {nav.map(([v, label, ic]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${view === v ? "text-hodl-cyan" : "text-hodl-muted"}`}
            >
              <Icon name={ic} className="h-5 w-5" />
              {label}
              <span className={`h-0.5 w-8 rounded-full ${view === v ? "bg-hodl-cyan shadow-[0_0_8px_#38d6ff]" : "bg-transparent"}`} />
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
