"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/watch/device";
import type { StoredEvent } from "@/lib/watch/events";
import { alertLink } from "@/lib/watch/link";
import { groupEvents } from "@/lib/watch/group";

const DOT = {
  critical: "bg-rose-400",
  warning: "bg-amber-400",
  info: "bg-hodl-cyan",
} as const;

const LABEL = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
} as const;

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(s)) return "";
  if (s < 90) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function AlertLink({ url }: { url?: string }) {
  const link = alertLink(url);
  if (!link) return null;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-block rounded-lg border border-hodl-cyan/40 px-2 py-1 text-[11px] font-medium text-hodl-cyan"
    >
      {link.label}
    </a>
  );
}

function EventRow({ e, now }: { e: StoredEvent; now: number }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.severity]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{e.title}</p>
        <p className="mt-0.5 text-xs text-hodl-muted">{e.detail}</p>
        <AlertLink url={e.url} />
        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-hodl-muted">
          {e.symbol ? `$${e.symbol} · ` : ""}
          {LABEL[e.severity]} · {ago(e.at, now)}
        </p>
      </div>
    </div>
  );
}

export function ObserveFeed() {
  const [events, setEvents] = useState<StoredEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const device = getDeviceId();

    const pull = () =>
      device
        ? fetch("/api/observe", { headers: { "x-device-id": device } })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("observe failed"))))
            .then((j: { events: StoredEvent[] }) => {
              if (cancelled) return;
              setEvents(j.events);
              setNow(Date.now());
              setFailed(false);
            })
            .catch(() => {
              if (!cancelled) setFailed(true);
            })
        : Promise.resolve().then(() => {
            if (!cancelled) setFailed(true);
          });

    pull();
    const id = setInterval(() => {
      if (!document.hidden) pull();
    }, 120_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const groups = events ? groupEvents(events) : [];

  return (
    <section>
      <p className="mb-3 text-xl font-bold">Observe</p>

      {events === null ? (
        <p className="hodl-card px-4 py-6 text-center text-xs text-hodl-muted">
          {failed ? "Observe is unavailable right now." : "Loading…"}
        </p>
      ) : events.length === 0 ? (
        <div className="hodl-card px-4 py-6 text-center text-sm text-hodl-muted">
          <p>No changes detected yet.</p>
          <p className="mt-1 text-xs">
            HODL re-scans your watched tokens every 5 minutes and only reports changes that matter.
          </p>
        </div>
      ) : (
        <div className="hodl-card divide-y divide-white/10 overflow-hidden">
          {groups.slice(0, 15).map((g) => {
            if (g.events.length === 1) {
              return (
                <div key={g.id} className="px-4 py-3">
                  <EventRow e={g.events[0]} now={now} />
                </div>
              );
            }
            const titles = g.events.slice(0, 3).map((e) => e.title).join(" · ");
            const more = g.events.length - 3;
            return (
              <details key={g.id} className="px-4 py-3">
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[g.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {g.symbol ? `$${g.symbol}` : "Token"}: {g.events.length} changes
                    </p>
                    <p className="mt-0.5 text-xs text-hodl-muted">
                      {titles}
                      {more > 0 ? ` · +${more} more` : ""}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-hodl-muted">
                      {LABEL[g.severity]} · {ago(g.events[0].at, now)} · tap to expand
                    </p>
                  </div>
                </summary>
                <div className="mt-3 space-y-3 border-l border-white/10 pl-4">
                  {g.events.map((e) => (
                    <EventRow key={e.id} e={e} now={now} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
