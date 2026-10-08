"use client";

import { PostedCaRow } from "./PostedCaRow";

import { useState, type ReactNode } from "react";
import type { ScanSuccess } from "@/lib/types/scan";
import { summarizeHealthGroups } from "@/health/score/groups";

type Data = ScanSuccess["data"];
type Rows = [string, string][];

const na = "N/A";

const usd = (v: number | null, d = 0) =>
  v === null
    ? na
    : `$${v.toLocaleString("en-US", { maximumFractionDigits: d })}`;

const pct = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? na
    : `${v.toFixed(d)}%`;

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

function price(p: number | null) {
  if (p === null || p <= 0) return na;
  return p >= 1
    ? p.toFixed(2)
    : p.toFixed(Math.min(10, Math.ceil(-Math.log10(p)) + 3));
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-hodl-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs">{sub}</p>}
    </div>
  );
}

export function HeaderStrip({ d }: { d: Data }) {
  const m = d.market;
  const ch = m.periods.m5.priceChangePct;
  const tone =
    ch === null ? "text-hodl-muted" : ch >= 0 ? "text-hodl-cyan" : "text-red-300";

  return (
    <section className="grid grid-cols-2 gap-4 hodl-card overflow-hidden p-4 sm:grid-cols-4">
      <Stat label={m.name ?? "Token"} value={`$${m.symbol ?? "—"}`} />
      <Stat
        label="Price"
        value={`$${price(m.priceUsd)}`}
        sub={
          <span className={tone}>
            5m {ch === null ? na : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
          </span>
        }
      />
      <Stat label="Market cap" value={usd(m.marketCapUsd)} />
      <Stat
        label="Health"
        value={d.health.score === null ? "—" : d.health.score.toFixed(1)}
        sub={<span className="text-hodl-muted">/ 10</span>}
      />
    </section>
  );
}

export function HealthPanel({ d }: { d: Data }) {
  const groups = summarizeHealthGroups(d.factors);
  const seen = d.factors.filter((f) => f.status === "AVAILABLE").length;

  return (
    <section className="hodl-card overflow-hidden p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
          Health v0.1.2
        </span>
        <span className="text-[10px] text-hodl-muted">
          {seen}/{d.factors.length} checks observed
        </span>
      </div>
      <p className="mt-2 text-5xl font-semibold">
        {d.health.score === null ? "—" : d.health.score.toFixed(1)}
        <span className="text-lg text-hodl-muted">/10</span>
      </p>
      <div className="mt-4 space-y-3">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="flex justify-between text-xs">
              <span className="uppercase tracking-[0.14em] text-hodl-muted">
                {g.group}
              </span>
              <span>
                {g.score === null ? na : g.score.toFixed(1)}{" "}
                <span className="text-hodl-muted">
                  {g.availableFactors}/{g.totalFactors}
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-hodl-blue"
                style={{ width: `${(g.score ?? 0) * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const TABS = ["MARKET", "FLOW", "HOLDERS", "CREATOR", "RISK"] as const;
type Tab = (typeof TABS)[number];

function rowsFor(tab: Tab, d: Data): Rows {
  const m = d.market;
  const i = d.identity;

  if (tab === "MARKET") {
    return [
      ["Liquidity", usd(m.liquidityUsd)],
      ["FDV", usd(m.fdvUsd)],
      ["24h volume", usd(m.periods.h24.volumeUsd)],
      ["Quote", m.quoteSymbol ?? na],
      ["Pair created", m.pairCreatedAt ? m.pairCreatedAt.slice(0, 10) : na],
    ];
  }

  if (tab === "FLOW") {
    return (["m5", "h1", "h6", "h24"] as const).map((k): [string, string] => {
      const p = m.periods[k];
      return [
        k,
        p.buys === null || p.sells === null
          ? na
          : `${p.buys} buys · ${p.sells} sells · ${usd(p.volumeUsd)}`,
      ];
    });
  }

  if (tab === "HOLDERS") {
    return [
      ["Holders", i.holderCount === null ? na : String(i.holderCount)],
      ["Top holder", pct(i.topHolderPct, 2)],
      ["Top excl. pools", pct(i.topHolderPctExcludingKnown, 2)],
      ...i.topHolders.slice(0, 5).map((h): [string, string] => [
        short(h.address),
        `${pct(h.pct, 2)}${h.knownType ? ` · ${h.knownType}` : ""}${h.insider ? " · insider" : ""}`,
      ]),
    ];
  }

  if (tab === "CREATOR") {
    return [
      ["Creator", i.creator ? short(i.creator) : na],
      ["Balance (raw)", i.creatorBalance === null ? na : String(i.creatorBalance)],
      ["Rugged", i.rugged === null ? na : i.rugged ? "YES" : "No"],
      ["Launchpad", i.launchpad ?? na],
    ];
  }

  return [
    ["Mint authority", i.mintAuthority],
    ["Freeze authority", i.freezeAuthority],
    ["LP locked (weighted)", pct(i.lpLockedPctWeighted)],
    ["Insider supply", pct(i.insiderSupplyPct)],
    ["Pools", i.poolCount === null ? na : String(i.poolCount)],
    ["Transfer fee", pct(i.transferFeePct)],
    ["Jupiter verified", i.jupVerified === null ? na : i.jupVerified ? "Yes" : "No"],
  ];
}

export function DetailTabs({
  d,
  initial = "MARKET",
}: {
  d: Data;
  initial?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <section className="hodl-card overflow-hidden">
      <div className="flex overflow-x-auto border-b border-hodl-line">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-[10px] uppercase tracking-[0.16em] ${
              t === tab
                ? "border-b-2 border-hodl-cyan text-hodl-text"
                : "text-hodl-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <dl className="divide-y divide-hodl-line">
        {rowsFor(tab, d).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-hodl-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {tab === "RISK" && <PostedCaRow key={d.market.mint} mint={d.market.mint} />}
    </section>
  );
}
