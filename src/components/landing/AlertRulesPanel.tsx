"use client";

import { useEffect, useRef, useState } from "react";
import { getDeviceId } from "@/lib/watch/device";
import {
  ALERT_CATALOG,
  CATEGORY_LABELS,
  mergeRules,
  type AlertCategory,
  type AlertDef,
  type AlertRule,
  type AlertRules,
} from "@/lib/watch/alert-catalog";

const ORDER: AlertCategory[] = ["safety", "liquidity", "market", "holders", "health", "social"];

function fmt(value: number, unit: string): string {
  const tight = unit.startsWith("%") || unit.startsWith("x");
  return `${value}${tight ? "" : " "}${unit}`;
}

function Row({
  def,
  rule,
  custom,
  onChange,
}: {
  def: AlertDef;
  rule: AlertRule | undefined;
  custom: boolean;
  onChange: (kind: string, patch: AlertRule) => void;
}) {
  const on = rule?.on ?? def.defaultOn;
  const th = def.threshold;
  const value = rule?.min ?? th?.default ?? 0;

  return (
    <div className="border-t border-hodl-line px-3 py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <span className={on ? "text-sm" : "text-sm text-hodl-muted"}>
          {def.label}
          {custom && <span className="ml-2 text-[10px] text-hodl-cyan">custom</span>}
        </span>
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

type Loaded = { rules?: AlertRules };

/** Global alert settings, or, with `mint`, overrides for just that token. */
export function AlertRulesPanel({ mint }: { mint?: string }) {
  const [base, setBase] = useState<AlertRules>({});
  const [rules, setRules] = useState<AlertRules>({});
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const device = getDeviceId();
    if (!device) return;
    let cancelled = false;
    const getJson = (url: string): Promise<Loaded> =>
      fetch(url, { headers: { "x-device-id": device } }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("load failed")),
      );

    Promise.all([
      mint ? getJson("/api/settings") : Promise.resolve<Loaded>({ rules: {} }),
      getJson(mint ? `/api/settings/token?mint=${encodeURIComponent(mint)}` : "/api/settings"),
    ])
      .then(([global, own]) => {
        if (cancelled) return;
        setBase(global.rules ?? {});
        setRules(own.rules ?? {});
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setNote("Couldn't load your alert settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [mint]);

  function save(next: AlertRules, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    setNote(null);
    timer.current = setTimeout(async () => {
      const device = getDeviceId();
      if (!device) return;
      try {
        const res = await fetch(mint ? "/api/settings/token" : "/api/settings", {
          method: "PUT",
          headers: { "content-type": "application/json", "x-device-id": device },
          body: JSON.stringify(mint ? { mint, rules: next } : { rules: next }),
        });
        if (!res.ok) throw new Error("save failed");
        setNote("Saved");
      } catch {
        setNote("Couldn't save that. Try again.");
      }
    }, delay);
  }

  const effective = mint ? mergeRules(base, rules) : rules;

  function change(kind: string, patch: AlertRule) {
    const current = effective[kind];
    // Start from what the token currently does, so a toggle flips the right way.
    const next: AlertRules = { ...rules, [kind]: { ...rules[kind], ...patch } };
    if (!mint) next[kind] = { ...current, ...patch };
    setRules(next);
    save(next, 450);
  }

  function reset() {
    setRules({});
    save({}, 0);
  }

  const activeCount = ALERT_CATALOG.filter((d) => effective[d.kind]?.on ?? d.defaultOn).length;

  return (
    <div className="mt-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
        {mint ? "Settings for this token" : "Choose your alerts"}
      </p>
      <p className="mt-2 text-[11px] text-hodl-muted">
        {!ready
          ? "Loading your alert settings…"
          : mint
            ? `${activeCount} of ${ALERT_CATALOG.length} alert types on. Anything you don't change follows your global settings.`
            : `${activeCount} of ${ALERT_CATALOG.length} alert types on. Switch any on or off and set how big a change must be.`}
      </p>

      {ready &&
        ORDER.map((cat) => {
          const defs = ALERT_CATALOG.filter((d) => d.category === cat);
          const onCount = defs.filter((d) => effective[d.kind]?.on ?? d.defaultOn).length;
          return (
            <details key={cat} className="mt-2 rounded-xl border border-hodl-line">
              <summary className="flex cursor-pointer items-center justify-between px-3 py-3 text-sm">
                <span>{CATEGORY_LABELS[cat]}</span>
                <span className="text-[11px] text-hodl-muted">
                  {onCount}/{defs.length} on
                </span>
              </summary>
              {defs.map((d) => (
                <Row
                  key={d.kind}
                  def={d}
                  rule={effective[d.kind]}
                  custom={Boolean(mint && rules[d.kind])}
                  onChange={change}
                />
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
          {mint ? "Use my global settings" : "Reset to defaults"}
        </button>
      )}

      {note && <p className="mt-2 text-xs text-amber-300">{note}</p>}
    </div>
  );
}
