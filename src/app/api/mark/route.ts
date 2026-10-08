import { NextResponse } from "next/server";
import { z } from "zod";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { rateLimit } from "@/lib/rate-limit";
import { delMark, getMark, putMark } from "@/lib/watch/mark";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

export const dynamic = "force-dynamic";

const deviceFrom = (r: Request) => {
  const id = r.headers.get("x-device-id") ?? "";
  return DEVICE_ID_PATTERN.test(id) ? id : null;
};
const err = (code: string, status: number) => NextResponse.json({ error: code }, { status });

const MarkSchema = z.object({
  mint: SolanaMintSchema,
  symbol: z.string().max(32).nullable().optional(),
  price: z.number().finite().nonnegative().nullable(),
  health: z.number().min(0).max(10).nullable().optional(),
  at: z.string().max(40),
});

async function guard(request: Request) {
  const device = deviceFrom(request);
  if (!device) return { error: err("invalid_device", 400) };
  const limit = await rateLimit(request, "mark", 60, 60);
  if (!limit.ok) {
    return {
      error: NextResponse.json(
        { error: "too_many" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      ),
    };
  }
  return { device };
}

export async function GET(request: Request) {
  const g = await guard(request);
  if (!g.device) return g.error;
  const mint = SolanaMintSchema.safeParse(new URL(request.url).searchParams.get("mint"));
  if (!mint.success) return err("invalid_body", 400);
  try {
    return NextResponse.json({ mark: await getMark(g.device, mint.data) });
  } catch (e) {
    console.error("mark get failed:", e);
    return err("storage_unavailable", 503);
  }
}

export async function PUT(request: Request) {
  const g = await guard(request);
  if (!g.device) return g.error;
  const parsed = MarkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err("invalid_body", 400);
  try {
    await putMark(g.device, {
      mint: parsed.data.mint,
      symbol: parsed.data.symbol ?? null,
      price: parsed.data.price,
      health: parsed.data.health ?? null,
      at: parsed.data.at,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("mark save failed:", e);
    return err("storage_unavailable", 503);
  }
}

export async function DELETE(request: Request) {
  const g = await guard(request);
  if (!g.device) return g.error;
  const body = (await request.json().catch(() => null)) as { mint?: unknown } | null;
  const mint = SolanaMintSchema.safeParse(body?.mint);
  if (!mint.success) return err("invalid_body", 400);
  try {
    await delMark(g.device, mint.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("mark delete failed:", e);
    return err("storage_unavailable", 503);
  }
}
