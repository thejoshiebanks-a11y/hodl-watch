"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertRulesPanel } from "./AlertRulesPanel";

export function TokenAlertsSheet({
  mint,
  symbol,
  onClose,
}: {
  mint: string;
  symbol: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alert settings for this token"
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-hodl-line bg-[#070d26] p-4 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            Alerts for {symbol ? `$${symbol}` : "this token"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-hodl-muted"
          >
            ✕
          </button>
        </div>
        <AlertRulesPanel mint={mint} />
      </div>
    </div>,
    document.body,
  );
}
