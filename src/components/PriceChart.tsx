"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/types/chart";
import { getDeviceId } from "@/lib/watch/device";
import { markerFor, snapTime } from "@/lib/watch/marker";
import {
  clusterBubbles,
  glyphFor,
  type Cluster,
  type Placed,
  type Side,
} from "@/lib/watch/bubbles";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "all"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const UP = "#2dd4bf";
const DOWN = "#fb7185";

type ChartEvent = {
  id: string;
  at: string;
  kind: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  value?: number;
};

type Bubble = Cluster<ChartEvent> & { fresh: boolean };

const SEVERITY_COLOR = {
  critical: "#fb7185",
  warning: "#fbbf24",
  info: "#38d6ff",
} as const;

function precisionFor(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 6;
  return price >= 1 ? 2 : Math.min(10, Math.ceil(-Math.log10(price)) + 3);
}

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function PriceChart({ pool, mint }: { pool: string | null; mint?: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const timesRef = useRef<number[]>([]);
  const candleMapRef = useRef<Map<number, { high: number; low: number }>>(new Map());
  const eventsRef = useRef<ChartEvent[]>([]);
  const scheduleRef = useRef<(() => void) | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>("1m");
  const [hasData, setHasData] = useState(false);
  const [events, setEvents] = useState<ChartEvent[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [result, setResult] = useState<{
    key: string;
    status: "ready" | "error";
    message?: string;
  } | null>(null);

  const key = `${pool}:${timeframe}`;
  const status = result?.key === key ? result.status : "loading";
  const open = bubbles.find((b) => b.key === openKey) ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7f8fbf",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(96,140,255,0.05)" },
        horzLines: { color: "rgba(96,140,255,0.07)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;

    // Works out where each change sits on screen and merges the ones that
    // would overlap. Runs whenever the chart moves, resizes or gets new data.
    function layout() {
      const box = containerRef.current;
      if (!box) return;
      const plotW = box.clientWidth - chart.priceScale("right").width();
      const h = box.clientHeight;
      const now = Date.now();

      const placed: Placed<ChartEvent>[] = [];
      for (const e of eventsRef.current) {
        const t = snapTime(timesRef.current, Math.floor(Date.parse(e.at) / 1000));
        if (t === null) continue;
        const c = candleMapRef.current.get(t);
        const x = chart.timeScale().timeToCoordinate(t as UTCTimestamp);
        if (!c || x === null || x < 8 || x > plotW - 8) continue;

        const side: Side = markerFor(e).position === "belowBar" ? "below" : "above";
        const py = candles.priceToCoordinate(side === "above" ? c.high : c.low);
        if (py === null) continue;

        const y = side === "above" ? py - 22 : py + 22;
        placed.push({ x, y: Math.min(Math.max(y, 18), h - 40), side, event: e });
      }

      setBubbles(
        clusterBubbles(placed).map((b) => ({
          ...b,
          fresh: b.events.some((e) => now - Date.parse(e.at) < 120_000),
        })),
      );
    }

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          layout();
        });
      }
      // The price axis can settle a moment after the time axis moves.
      clearTimeout(timer);
      timer = setTimeout(layout, 100);
    }
    scheduleRef.current = schedule;

    chart.timeScale().subscribeVisibleLogicalRangeChange(schedule);
    chart.subscribeCrosshairMove(schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(schedule);
      chart.unsubscribeCrosshairMove(schedule);
      scheduleRef.current = null;
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!pool) return;

    let cancelled = false;
    let first = true;

    async function load() {
      try {
        const response = await fetch(`/api/chart?pool=${pool}&timeframe=${timeframe}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`chart route ${response.status}`);

        const body = (await response.json()) as { candles: Candle[] };
        if (cancelled || !candleRef.current || !volumeRef.current) return;

        const last = body.candles[body.candles.length - 1];
        if (!last) throw new Error("no candles returned");

        const precision = precisionFor(last.close);
        candleRef.current.applyOptions({
          priceFormat: { type: "price", precision, minMove: Math.pow(10, -precision) },
        });
        candleRef.current.setData(
          body.candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
        volumeRef.current.setData(
          body.candles.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? "rgba(45,212,191,0.4)" : "rgba(251,113,133,0.4)",
          })),
        );

        timesRef.current = body.candles.map((c) => c.time as number);
        candleMapRef.current = new Map(
          body.candles.map((c) => [c.time as number, { high: c.high, low: c.low }]),
        );

        if (first) {
          chartRef.current?.timeScale().fitContent();
          first = false;
        }
        scheduleRef.current?.();
        setHasData(true);
        setResult({ key, status: "ready" });
      } catch (err) {
        if (!cancelled) {
          setResult({
            key,
            status: "error",
            message: err instanceof Error ? err.message : "unknown error",
          });
        }
      }
    }

    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pool, timeframe, key]);

  useEffect(() => {
    if (!mint) return;
    let cancelled = false;

    async function loadEvents() {
      try {
        const device = getDeviceId();
        const res = await fetch(`/api/token-events?mint=${encodeURIComponent(mint ?? "")}`, {
          cache: "no-store",
          headers: device ? { "x-device-id": device } : undefined,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { events: ChartEvent[] };
        if (cancelled) return;
        eventsRef.current = body.events;
        setEvents(body.events);
        scheduleRef.current?.();
      } catch {
        // Bubbles are a bonus; the chart works without them.
      }
    }

    loadEvents();
    const id = setInterval(loadEvents, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mint]);

  if (!pool) return null;

  return (
    <div className="space-y-3">
      <div className="flex hodl-card p-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-[0.1em] ${
              tf === timeframe
                ? "bg-gradient-to-r from-hodl-blue to-blue-500 text-white shadow-lg shadow-blue-900/40"
                : "text-hodl-muted"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="relative hodl-card overflow-hidden">
        <div ref={containerRef} className="h-[360px] w-full" />

        <div className="pointer-events-none absolute inset-0">
          {bubbles.map((b) => {
            const top = b.events[0];
            const color = SEVERITY_COLOR[top.severity];
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setOpenKey(b.key === openKey ? null : b.key)}
                aria-label={`${top.title}${b.events.length > 1 ? ` and ${b.events.length - 1} more` : ""}`}
                className="pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[13px] leading-none"
                style={{
                  left: b.x,
                  top: b.y,
                  background: "#0b1230",
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 12px ${color}66`,
                }}
              >
                {b.fresh && (
                  <span
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ background: `${color}55` }}
                  />
                )}
                <span className="relative">{glyphFor(top.kind, b.side)}</span>
                {b.events.length > 1 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-black"
                    style={{ background: color }}
                  >
                    {b.events.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {hasData && status === "ready" && (
          <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
        )}

        {open && (
          <div className="absolute inset-x-2 bottom-2 z-10 rounded-2xl border border-white/10 bg-[#0b1230]/95 p-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
                {open.events.length > 1 ? `${open.events.length} changes here` : "Change"}
              </p>
              <button
                type="button"
                onClick={() => setOpenKey(null)}
                aria-label="Close"
                className="px-2 text-hodl-muted"
              >
                ✕
              </button>
            </div>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {open.events.slice(0, 6).map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: SEVERITY_COLOR[e.severity] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm">
                      {e.title}{" "}
                      <span className="text-[11px] text-hodl-muted">{ago(e.at)}</span>
                    </p>
                    <p className="text-xs text-hodl-muted">{e.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-hodl-muted">
            {status === "error"
              ? `Chart unavailable: ${result?.message ?? "unknown"}`
              : "Loading chart…"}
          </div>
        )}
        {hasData && status === "error" && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-300">
            delayed
          </span>
        )}
      </div>

      {mint && events.length > 0 && (
        <div className="hodl-card p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
            Changes marked on the chart
          </p>
          <ul className="mt-3 space-y-3">
            {events.slice(0, 6).map((e) => (
              <li key={e.id} className="flex gap-3">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: SEVERITY_COLOR[e.severity] }}
                />
                <div className="min-w-0">
                  <p className="text-sm">
                    {e.title}{" "}
                    <span className="text-[11px] text-hodl-muted">{ago(e.at)}</span>
                  </p>
                  <p className="text-xs text-hodl-muted">{e.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
