"use client";

import { useEffect } from "react";

/** People who open a shared link go straight to the token. Link-preview bots don't run this. */
export function OpenToken({ mint }: { mint: string }) {
  useEffect(() => {
    window.location.replace(`/?token=${encodeURIComponent(mint)}`);
  }, [mint]);
  return null;
}
