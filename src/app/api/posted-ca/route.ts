import { NextResponse } from "next/server";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { getScanCached } from "@/lib/scan/cache";
import { rateLimit } from "@/lib/rate-limit";
import { checkPostedCa } from "@/lib/social/posted";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mint = SolanaMintSchema.safeParse(new URL(request.url).searchParams.get("mint"));
  if (!mint.success) return NextResponse.json({ error: "invalid_mint" }, { status: 400 });

  const limit = await rateLimit(request, "posted-ca", 20, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "too_many" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    const scan = await getScanCached(mint.data);
    if (!scan.ok) return NextResponse.json({ state: "UNKNOWN", reason: "no_scan" });
    return NextResponse.json(await checkPostedCa(mint.data, scan.data.market.socials));
  } catch (e) {
    console.error("posted-ca failed:", e);
    return NextResponse.json({ state: "UNKNOWN", reason: "x_error" }, { status: 503 });
  }
}
