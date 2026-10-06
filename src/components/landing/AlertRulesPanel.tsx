"use client";

import { useEffect, useRef, useState } from "react";
import { getDeviceId } from "@/lib/watch/device";
import {
  ALERT_CATALOG,
  CATEGORY_LABELS,
  type AlertCategory,
  type AlertDef,
  type AlertRule,
  type AlertRules,
} from "@/lib/watch/alert-catalog";

const ORDER: AlertCategory[] = ["safety", "liquidity", "market", "holders", "health"];

function fmt(value: number, unit: string): string {
  const tight = unit.startsWith("%") || unit.startsWith("x");
  return `${value}${tight ? "" : " "}${unit}`;
}

function Row({
  def,
  rule,
  onChange,
}: {
  def: AlertDef;
  rule: AlertRule | undefined;
  onChange: (kind: string, patch: AlertRule) => void;
}) {
  const on = rule?.on ?? def.defaultOn;
  const th = def.threshold;
  const value = rule?.min ?? th?.default ?? 0;

  return (
    <div className="border-t border-hodl-line px-3 py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <span className={on ? "text-sm" : "text-sm text-hodl-muted"}>{def.label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={def.label}
          onClick={() => onChange(def.kind, { on: !on })}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            on ? "bg-hodl-cyan/80" : "bg-hodl-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              on ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {on && th && (
        <div className="mt-3">
          <p className="text-[11px] text-hodl-muted">
            Alert at {fmt(value, th.unit)} or more
          </p>
          <input
            type="range"
            min={th.min}
            max={th.max}
            step={th.step}
            value={value}
            aria-label={`${def.label} threshold`}
            onChange={(e) => onChange(def.kind, { on: true, min: Number(e.target.value) })}
            className="mt-2 w-full"
            style={{ accentColor: "#38d6ff" }}
          />
          <div className="flex justify-between text-[10px] text-hodl-muted">
            <span>{fmt(th.min, th.unit)}</span>
            <span>{fmt(th.max, th.unit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AlertRulesPanel() {
  const [rules, setRules] = useState<AlertRules>({});
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const device = getDeviceId();
    if (!device) return;
    let cancelled = false;
    fetch("/api/settings", { headers: { "x-device-id": device } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("settings failed"))))
      .then((j: { rules?: AlertRules }) => {
        if (cancelled) return;
        setRules(j.rules ?? {});
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setNote("Couldn't load your alert settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function save(next: AlertRules, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    setNote(null);
    timer.current = setTimeout(async () => {
      const device = getDeviceId();
      if (!device) return;
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "content-type": "application/json", "x-device-id": device },
          body: JSON.stringify({ rules: next }),
        });
        if (!res.ok) throw new Error("save failed");
        setNote("Saved");
      } catch {
        setNote("Couldn't save that. Try again.");
      }
    }, delay);
  }

  function change(kind: string, patch: AlertRule) {
    const next: AlertRules = { ...rules, [kind]: { ...rules[kind], ...patch } };
    setRules(next);
    save(next, 450);
  }

  function reset() {
    setRules({});
    save({}, 0);
  }

  const activeCount = ALERT_CATALOG.filter((d) => rules[d.kind]?.on ?? d.defaultOn).length;

  return (
    <div className="mt-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
        Choose your alerts
      </p>
      <p className="mt-2 text-[11px] text-hodl-muted">
        {ready
          ? `${activeCount} of ${ALERT_CATALOG.length} alert types on. Switch any on or off and set how big a change must be.`
          : "Loading your alert settings…"}
      </p>

      {ready &&
        ORDER.map((cat) => {
          const defs = ALERT_CATALOG.filter((d) => d.category === cat);
          const onCount = defs.filter((d) => rules[d.kind]?.on ?? d.defaultOn).length;
          return (
            <details key={cat} className="mt-2 rounded-xl border border-hodl-line">
              <summary className="flex cursor-pointer items-center justify-between px-3 py-3 text-sm">
                <span>{CATEGORY_LABELS[cat]}</span>
                <span className="text-[11px] text-hodl-muted">
                  {onCount}/{defs.length} on
                </span>
              </summary>
              {defs.map((d) => (
                <Row key={d.kind} def={d} rule={rules[d.kind]} onChange={change} />
              ))}
            </details>
          );
        })}

      {ready && (
        <button
          type="button"
          onClick={reset}
          className="mt-3 w-full rounded-xl border border-hodl-line py-2.5 text-xs text-hodl-muted"
        >
          Reset to defaults
        </button>
      )}

      {note && <p className="mt-2 text-xs text-amber-300">{note}</p>}
    </div>
  );
}
