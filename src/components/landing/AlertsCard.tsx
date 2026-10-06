"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/watch/device";

type Mode = "checking" | "unsupported" | "install-ios" | "denied" | "off" | "on";

function detect(): Mode | null {
  if (typeof window === "undefined") return "checking";
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!supported) return isIOS && !standalone ? "install-ios" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return null;
}

function toKey(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function AlertsCard() {
  const [mode, setMode] = useState<Mode>(() => detect() ?? "checking");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [minSev, setMinSev] = useState<"critical" | "warning">("warning");

  useEffect(() => {
    if (detect() !== null) return;
    let cancelled = false;
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setMode(sub && Notification.permission === "granted" ? "on" : "off");
      })
      .catch(() => {
        if (!cancelled) setMode("off");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "on") return;
    const device = getDeviceId();
    if (!device) return;
    let cancelled = false;
    fetch("/api/settings", { headers: { "x-device-id": device } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("settings failed"))))
      .then((j: { minSeverity: "critical" | "warning" }) => {
        if (!cancelled) setMinSev(j.minSeverity);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function saveSev(next: "critical" | "warning") {
    const device = getDeviceId();
    if (!device || next === minSev) return;
    const before = minSev;
    setMinSev(next);
    setNote(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-device-id": device },
        body: JSON.stringify({ minSeverity: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setMinSev(before);
      setNote("Couldn't save that setting. Try again.");
    }
  }

  async function enable() {
    const device = getDeviceId();
    if (!device || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMode(perm === "denied" ? "denied" : "off");
        return;
      }
      const keyRes = await fetch("/api/push");
      if (!keyRes.ok) throw new Error("no key");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toKey(publicKey),
        }));

      const save = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": device },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!save.ok) throw new Error("save failed");
      setMode("on");
    } catch {
      setNote("Couldn't turn on alerts. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    const device = getDeviceId();
    if (!device || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
      await fetch("/api/push", { method: "DELETE", headers: { "x-device-id": device } });
      setMode("off");
    } catch {
      setNote("Couldn't turn off alerts. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const device = getDeviceId();
    if (!device || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "x-device-id": device },
      });
      if (res.status === 429) setNote("Wait a few seconds before another test.");
      else if (!res.ok) setNote("The test didn't go through. Try turning alerts off and on again.");
      else setNote("Test sent. It should arrive in a moment.");
    } catch {
      setNote("Couldn't reach HODL. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "mt-4 w-full rounded-xl bg-gradient-to-r from-hodl-blue to-blue-500 py-3 text-sm font-semibold disabled:opacity-60";
  const ghost =
    "mt-3 w-full rounded-xl border border-hodl-line py-3 text-sm text-hodl-muted disabled:opacity-60";

  return (
    <section className="hodl-card mb-8 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">Alerts</p>

      {mode === "checking" && (
        <p className="mt-3 text-sm text-hodl-muted">Checking this browser…</p>
      )}

      {mode === "off" && (
        <>
          <p className="mt-3 text-sm text-hodl-muted">
            Get a push when a watched token changes in a way that matters, with the reason attached.
          </p>
          <button type="button" onClick={enable} disabled={busy} className={btn}>
            {busy ? "Turning on…" : "Turn on alerts"}
          </button>
        </>
      )}

      {mode === "on" && (
        <>
          <p className="mt-3 text-sm text-hodl-muted">
            Alerts are on for this browser. HODL only pings you when something material changes.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-hodl-muted">
            Push me for
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["warning", "Critical + Warnings"],
                ["critical", "Critical only"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => saveSev(v)}
                className={
                  minSev === v
                    ? "rounded-xl border border-hodl-cyan/50 bg-hodl-cyan/10 py-2.5 text-xs font-semibold text-hodl-cyan"
                    : "rounded-xl border border-hodl-line py-2.5 text-xs text-hodl-muted"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-hodl-muted">
            Info changes always stay in Observe and never push.
          </p>
          <button type="button" onClick={sendTest} disabled={busy} className={btn}>
            Send a test alert
          </button>
          <button type="button" onClick={disable} disabled={busy} className={ghost}>
            Turn off alerts
          </button>
        </>
      )}

      {mode === "install-ios" && (
        <p className="mt-3 text-sm text-hodl-muted">
          On iPhone and iPad, alerts need HODL on your Home Screen. Tap the Share button, choose
          Add to Home Screen, then open HODL from there and come back to this tab.
        </p>
      )}

      {mode === "denied" && (
        <p className="mt-3 text-sm text-hodl-muted">
          Notifications are blocked for HODL in this browser. Allow them in your browser or site
          settings, then reload.
        </p>
      )}

      {mode === "unsupported" && (
        <p className="mt-3 text-sm text-hodl-muted">
          This browser can&apos;t receive push alerts (in-app browsers and Opera Mini can&apos;t).
          Open HODL in Chrome, Edge, Firefox, Safari or Opera. The Observe feed below still works
          everywhere.
        </p>
      )}

      {note && <p className="mt-3 text-xs text-amber-300">{note}</p>}
    </section>
  );
}
