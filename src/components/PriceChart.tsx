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

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "all"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const UP = "#2dd4bf";
const DOWN = "#fb7185";

function precisionFor(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 6;
  return price >= 1 ? 2 : Math.min(10, Math.ceil(-Math.log10(price)) + 3);
}

export function PriceChart({ pool }: { pool: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>("1m");
  const [hasData, setHasData] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    status: "ready" | "error";
    message?: string;
  } | null>(null);

  const key = `${pool}:${timeframe}`;
  const status = result?.key === key ? result.status : "loading";

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
        vertLines: { color: "rgba(96,140,255,0.07)" },
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

    return () => {
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

        if (first) {
          chartRef.current?.timeScale().fitContent();
          first = false;
        }
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
    </div>
  );
}
