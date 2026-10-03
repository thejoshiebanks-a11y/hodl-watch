"use client";

import { useState } from "react";
import type { ScanResponse, ScanSuccess } from "@/lib/types/scan";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { summarizeHealthGroups } from "@/health/score/groups";

const emptyBadges = [
  { label: "QUOTE", value: "—" },
  { label: "MINT", value: "—" },
  { label: "FREEZE", value: "—" },
  { label: "CA POSTED", value: "UNKNOWN" },
];

export default function Home() {
  const [mint, setMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ScanSuccess["data"] | null>(null);

  async function handleScan() {
    setError(null);

    const result = SolanaMintSchema.safeParse(mint);

    if (!result.success) {
      setSnapshot(null);
      setError("Enter a valid Solana mint address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mint: result.data }),
      });

      const data: ScanResponse = await response.json();

      if (!response.ok || !("data" in data)) {
        setSnapshot(null);
        setError(
          "error" in data ? data.error : "Unable to complete scan.",
        );
        return;
      }

      setSnapshot(data.data);
    } catch {
      setSnapshot(null);
      setError("Unable to reach the HODL scan service.");
    } finally {
      setLoading(false);
    }
  }

  const badges = snapshot
    ? [
        {
          label: "QUOTE",
          value: snapshot.market.quoteSymbol ?? "UNKNOWN",
        },
        {
          label: "MINT",
          value: snapshot.identity.mintAuthority,
        },
        {
          label: "FREEZE",
          value: snapshot.identity.freezeAuthority,
        },
        {
          label: "CA POSTED",
          value: "UNKNOWN",
        },
      ]
    : emptyBadges;

  const healthGroups = snapshot
    ? summarizeHealthGroups(snapshot.factors)
    : [];

  return (
    <main className="min-h-screen bg-[#08090b] text-zinc-100">
      <div className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/8 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-black">
                H
              </div>
              <span className="text-sm font-semibold tracking-[0.18em]">
                HODL
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Health · Observe · Detect · Live
            </p>
          </div>

          <div className="rounded-full border border-white/8 bg-white/3 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Surveillance / Scan
          </div>
        </header>

        <section className="grid gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              One coin. One screen.
            </p>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
              You trade.
              <br />
              <span className="text-zinc-500">HODL watches.</span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              Paste a Solana mint and get a compressed view of the tape,
              liquidity, structure, identity, and material events.
            </p>

            <div className="mt-8 flex max-w-2xl gap-2">
              <input
                type="text"
                value={mint}
                onChange={(event) => setMint(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) {
                    handleScan();
                  }
                }}
                placeholder="Paste Solana mint address"
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={handleScan}
                disabled={loading}
                className="rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Scanning..." : "Scan"}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-xs text-zinc-500">{error}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Scan
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                {snapshot ? "Snapshot" : loading ? "Working" : "Awaiting CA"}
              </span>
            </div>

            <div className="py-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    Health
                  </p>
                  <p
                    className={`mt-1 text-5xl font-semibold tracking-[-0.05em] ${
                      snapshot ? "text-white" : "text-zinc-700"
                    }`}
                  >
                    {snapshot?.health.score !== null &&
                    snapshot?.health.score !== undefined
                      ? snapshot.health.score.toFixed(1)
                      : "—"}
                    <span className="text-xl text-zinc-600">/10</span>
                  </p>
                  {snapshot && (
                    <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      <span>Health v0.1.1</span>
                      <span className="text-zinc-800">•</span>
                      <span>
                        {Math.round(snapshot.health.coverage * 100)}% of checks observed
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    {snapshot?.market.symbol ?? "Market"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {snapshot?.market.marketCapUsd !== null &&
                    snapshot?.market.marketCapUsd !== undefined
                      ? `$${snapshot.market.marketCapUsd.toLocaleString()} MC`
                      : "Waiting"}
                  </p>
                </div>
              </div>

              {snapshot && (
                <div className="mt-7 border-t border-white/6 pt-5">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["TAPE", "LIQUIDITY", "FLOW", "STRUCTURE"] as const).map(
                      (group) => {
                        const groupFactors = snapshot.factors.filter(
                          (factor) => factor.group === group,
                        );

                        const available = groupFactors.filter(
                          (factor) =>
                            factor.status === "AVAILABLE" &&
                            factor.value !== null,
                        );

                        const groupScore =
                          available.length > 0
                            ? available.reduce(
                                (sum, factor) => sum + (factor.value ?? 0),
                                0,
                              ) / available.length
                            : null;

                        return (
                          <div
                            key={group}
                            className="rounded-lg border border-white/6 bg-black/20 px-3 py-2.5"
                          >
                            <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                              {group}
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-300">
                              {groupScore !== null
                                ? groupScore.toFixed(1)
                                : "N/A"}
                            </p>
                            <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                              {available.length}/{groupFactors.length} observed
                            </p>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {snapshot && (
                <div className="mt-6 border-t border-white/6 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                      Why Health
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                      {snapshot.health.availableFactors}/
                      {snapshot.health.scoredFactors} observed
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    {healthGroups.map((summary) => {
                      const factors = snapshot.factors.filter(
                        (factor) => factor.group === summary.group,
                      );

                      const available = factors.filter(
                        (factor) =>
                          factor.status === "AVAILABLE" &&
                          factor.value !== null,
                      );

                      const unavailable = factors.filter(
                        (factor) => factor.status === "N/A",
                      );

                      let detail = "No observation available.";

                      if (summary.group === "TAPE") {
                        const changes = available
                          .filter(
                            (factor) =>
                              factor.key === "tape_5m" ||
                              factor.key === "tape_1h",
                          )
                          .map((factor) => factor.explanation.match(
                            /price change is ([+-]?\d+(?:\.\d+)?)%/,
                          )?.[1]);

                        const labels = ["5m", "1h"];
                        const values = changes
                          .map((value, index) =>
                            value !== undefined
                              ? `${labels[index]} ${Number(value) >= 0 ? "+" : ""}${value}%`
                              : null,
                          )
                          .filter(Boolean);

                        detail =
                          values.length > 0
                            ? values.join(" · ")
                            : "Price movement observed";
                      } else if (summary.group === "LIQUIDITY") {
                        const liquidity = snapshot.market.liquidityUsd;

                        if (liquidity !== null) {
                          detail = `$${liquidity.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })} liquidity`;
                        } else {
                          detail = "Liquidity unavailable";
                        }
                      } else if (summary.group === "FLOW") {
                        const flowFactor = available.find((factor) => factor.key === "flow");
                        const h1 = snapshot.market.periods.h1;
                        detail = flowFactor
                          ? `${h1.buys ?? "?"} buys · ${h1.sells ?? "?"} sells (1h)`
                          : "Buy/sell flow data unavailable";
                      } else if (summary.group === "STRUCTURE") {
                        const authority = snapshot.identity.mintAuthority;
                        const freeze = snapshot.identity.freezeAuthority;

                        detail =
                          authority === "REVOKED" && freeze === "REVOKED"
                            ? "Mint and freeze authorities revoked"
                            : "Authority status observed";
                      }

                      return (
                        <div
                          key={summary.group}
                          className="rounded-lg border border-white/5 bg-black/15 px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                                  {summary.group}
                                </p>
                                <span className="text-[9px] text-zinc-800">·</span>
                                <p className="text-[10px] font-medium text-zinc-400">
                                  {summary.score !== null
                                    ? summary.score.toFixed(1)
                                    : "N/A"}
                                </p>
                              </div>

                              <p className="mt-1 text-[10px] leading-5 text-zinc-500">
                                {detail}
                              </p>
                            </div>

                            <p className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-zinc-700">
                              {summary.availableFactors}/{summary.totalFactors}
                            </p>
                          </div>

                          {unavailable.length > 0 && (
                            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-zinc-700">
                              {unavailable.length} unavailable
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {snapshot && (
                <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/6 pt-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      Price
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {snapshot.market.priceUsd !== null
                        ? `$${snapshot.market.priceUsd.toLocaleString()}`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      Liquidity
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {snapshot.market.liquidityUsd !== null
                        ? `$${snapshot.market.liquidityUsd.toLocaleString()}`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      24h Volume
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {snapshot.market.periods.h24.volumeUsd !== null
                        ? `$${snapshot.market.periods.h24.volumeUsd.toLocaleString()}`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                      1h
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {snapshot.market.periods.h1.priceChangePct !== null
                        ? `${snapshot.market.periods.h1.priceChangePct}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className="rounded-lg border border-white/6 bg-black/20 px-3 py-2.5"
                >
                  <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    {badge.label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-zinc-500">
                    {badge.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-3">
          <div className="rounded-xl border border-white/6 bg-white/[0.018] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Health
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              A deterministic 0–10 measurement with every factor visible.
            </p>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/[0.018] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Observe
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Material changes, not a noisy swap firehose.
            </p>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/[0.018] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Detect
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Rules fire on facts you chose to watch.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-white/6 bg-white/[0.018]">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Identity
            </span>
            <span className="text-[10px] text-zinc-700">
              {snapshot ? "OBSERVED" : "WAITING"}
            </span>
          </div>

          <div className="grid gap-4 px-4 py-4 sm:grid-cols-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Creator
              </p>
              <p className="mt-1 break-all text-[11px] text-zinc-400">
                {snapshot?.identity.creator ?? "UNKNOWN"}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Holders
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {snapshot?.identity.holderCount ?? "N/A"}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Top holder
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatPct(snapshot?.identity.topHolderPct, 2)}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                LP locked
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatPct(snapshot?.identity.lpLockedPctWeighted)}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Insider supply
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatPct(snapshot?.identity.insiderSupplyPct)}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Launchpad
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {snapshot?.identity.launchpad ?? "N/A"}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Pools
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {snapshot?.identity.poolCount ?? "N/A"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-white/6 bg-white/[0.018]">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Observe feed
            </span>
            <span className="text-[10px] text-zinc-700">LIVE</span>
          </div>

          <div>
            <div className="flex gap-4 border-b border-white/5 px-4 py-3">
              <span className="w-8 text-[10px] text-zinc-700">—</span>
              <span className="text-xs text-zinc-600">
                {snapshot
                  ? "Snapshot captured. Material event detection is not wired yet."
                  : "No material events yet"}
              </span>
            </div>

            <div className="flex gap-4 px-4 py-3">
              <span className="w-8 text-[10px] text-zinc-700">—</span>
              <span className="text-xs text-zinc-600">
                {snapshot
                  ? `Observed ${snapshot.market.symbol ?? "token"} via ${snapshot.market.provider}.`
                  : "Paste a mint address to begin surveillance"}
              </span>
            </div>
          </div>
        </section>

        <footer className="py-10 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-700">
          HODL · Health. Observe. Detect. Live.
        </footer>
      </div>
    </main>
  );
}

function formatPct(
  value: number | null | undefined,
  digits = 1,
): string {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "N/A"
    : `${value.toFixed(digits)}%`;
}
