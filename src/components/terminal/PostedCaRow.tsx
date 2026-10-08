"use client";

import { useEffect, useState } from "react";

type Result = {
  state: "YES" | "NOT_SEEN" | "UNKNOWN";
  handle?: string;
  url?: string;
  reason?: string;
};

const WHY: Record<string, string> = {
  no_x_account: "No linked X account",
  no_token: "X check not set up",
  budget: "X check paused for today",
  x_error: "X unavailable",
  no_scan: "Token not found",
};

export function PostedCaRow({ mint }: { mint: string }) {
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    let off = false;
    fetch(`/api/posted-ca?mint=${encodeURIComponent(mint)}`)
      .then((res) => res.json())
      .then((j: Result) => {
        if (!off) setR(j);
      })
      .catch(() => {
        if (!off) setR({ state: "UNKNOWN", reason: "x_error" });
      });
    return () => {
      off = true;
    };
  }, [mint]);

  let value: React.ReactNode = <span className="text-hodl-muted">Checking…</span>;
  let sub: string | null = null;

  if (r?.state === "YES") {
    value =
      r.url?.startsWith("https://x.com/") ? (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-hodl-cyan">
          Yes · @{r.handle} ↗
        </a>
      ) : (
        <span>Yes · @{r.handle}</span>
      );
  } else if (r?.state === "NOT_SEEN") {
    value = <span>Not seen · 7 days</span>;
    sub = `No post from @${r.handle} with this address in the last 7 days.`;
  } else if (r?.state === "UNKNOWN") {
    value = <span className="text-hodl-muted">Unknown</span>;
    sub = WHY[r.reason ?? ""] ?? "X unavailable";
  }

  return (
    <div className="border-t border-hodl-line px-4 py-2.5 text-sm">
      <div className="flex justify-between gap-4">
        <span className="text-hodl-muted">Posted CA (linked X)</span>
        <span className="text-right">{value}</span>
      </div>
      {sub && <p className="mt-1 text-right text-[11px] text-hodl-muted">{sub}</p>}
    </div>
  );
}
