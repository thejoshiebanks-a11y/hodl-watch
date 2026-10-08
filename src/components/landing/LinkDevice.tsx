"use client";

import { useState } from "react";
import { getDeviceId, setDeviceId } from "@/lib/watch/device";

const JSON_HEADERS = { "content-type": "application/json" };

/** Moves this browser's push subscription from its old ID to the shared one. */
async function moveSubscription(oldId: string, newId: string) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push", {
      method: "DELETE",
      headers: { ...JSON_HEADERS, "x-device-id": oldId },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await fetch("/api/push", {
      method: "POST",
      headers: { ...JSON_HEADERS, "x-device-id": newId },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch {
    // alerts can be switched on again from the Alerts card
  }
}

export function LinkDevice() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function makeCode() {
    const device = getDeviceId();
    if (!device || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/link", { method: "POST", headers: { "x-device-id": device } });
      if (!res.ok) throw new Error("failed");
      const j = (await res.json()) as { code: string };
      setCode(j.code);
    } catch {
      setMsg("Couldn't make a code. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const current = getDeviceId();
    if (!current || busy || input.trim().length < 6) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/link", {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ code: input }),
      });
      if (res.status === 429) {
        setMsg("Too many tries. Wait a few minutes.");
        return;
      }
      if (!res.ok) {
        setMsg("That code isn't valid or has expired.");
        return;
      }
      const { device } = (await res.json()) as { device: string };
      if (device === current) {
        setMsg("This device is already linked.");
        return;
      }
      await moveSubscription(current, device);
      if (!setDeviceId(device)) throw new Error("storage");
      window.location.reload();
    } catch {
      setMsg("Couldn't link. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const ghost =
    "mt-3 w-full rounded-xl border border-hodl-line py-3 text-sm text-hodl-muted disabled:opacity-60";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={ghost}>
        Link another device
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-hodl-line p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">Link devices</p>
      <p className="mt-2 text-xs text-hodl-muted">
        Share one watchlist and one set of alert settings. Make a code on the device that has your
        list, then enter it on the other one.
      </p>

      {code ? (
        <p className="mt-3 text-center font-mono text-3xl font-bold tracking-[0.3em]">{code}</p>
      ) : (
        <button type="button" onClick={makeCode} disabled={busy} className={ghost}>
          Make a code on this device
        </button>
      )}
      {code && <p className="mt-1 text-center text-[11px] text-hodl-muted">Works once, for 10 minutes.</p>}

      <p className="mt-4 text-xs text-hodl-muted">
        Or enter a code here. This device&apos;s own watchlist will be replaced by the other one.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          maxLength={7}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect="off"
          className="min-w-0 flex-1 rounded-xl border border-hodl-line bg-transparent px-3 py-2 text-center font-mono tracking-[0.2em]"
        />
        <button
          type="button"
          onClick={join}
          disabled={busy || input.trim().length < 6}
          className="rounded-xl bg-hodl-cyan/90 px-4 text-sm font-semibold text-black disabled:opacity-50"
        >
          Link
        </button>
      </div>

      {msg && <p className="mt-3 text-xs text-amber-300">{msg}</p>}
    </div>
  );
}
