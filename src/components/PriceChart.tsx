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

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const UP = "#2dd4bf";
const DOWN = "#f87171";

function precisionFor(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 6;
  if (price >= 1) return 2;
  return Math.min(10, Math.ceil(-Math.log10(price)) + 3);
}

export function PriceChart({ pool }: { pool: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [result, setResult] = useState<{
    key: string;
    status: "ready" | "error";
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
        textColor: "#71717a",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
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
    });

    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

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
        const response = await fetch(
          `/api/chart?pool=${pool}&timeframe=${timeframe}`,
          { cache: "no-store" },
        );

        if (!response.ok) throw new Error(String(response.status));

        const body = (await response.json()) as { candles: Candle[] };

        if (cancelled || !candleRef.current || !volumeRef.current) return;

        const last = body.candles[body.candles.length - 1];

        if (!last) {
          setResult({ key, status: "error" });
          return;
        }

        const precision = precisionFor(last.close);

        candleRef.current.applyOptions({
          priceFormat: {
            type: "price",
            precision,
            minMove: Math.pow(10, -precision),
          },
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
            color:
              c.close >= c.open
                ? "rgba(45,212,191,0.35)"
                : "rgba(248,113,113,0.35)",
          })),
        );

        if (first) {
          chartRef.current?.timeScale().fitContent();
          first = false;
        }

        setResult({ key, status: "ready" });
      } catch {
        if (!cancelled) setResult({ key, status: "error" });
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
    <section className="mt-4 rounded-xl border border-white/6 bg-white/[0.018]">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Chart
        </span>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                tf === timeframe
                  ? "bg-white/10 text-zinc-200"
                  : "text-zinc-600"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div ref={containerRef} className="h-[320px] w-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
            {status === "loading" ? "Loading chart…" : "Chart data unavailable"}
          </div>
        )}
      </div>
    </section>
  );
}
