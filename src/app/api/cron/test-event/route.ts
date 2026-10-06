import { NextResponse } from "next/server";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { pushEvents } from "@/lib/watch/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mint = SolanaMintSchema.safeParse(
    new URL(request.url).searchParams.get("mint"),
  );
  if (!mint.success) {
    return NextResponse.json({ error: "invalid_mint" }, { status: 400 });
  }

  const stored = await pushEvents(mint.data, null, new Date().toISOString(), [
    {
      kind: "TEST",
      severity: "info",
      title: "Test event (ignore)",
      detail: "Sent by HODL to confirm the Observe feed is working.",
    },
  ]);

  return NextResponse.json({ sent: stored.length });
}
