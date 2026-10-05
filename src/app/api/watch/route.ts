import { NextResponse } from "next/server";
import { z } from "zod";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { addWatch, listWatches, removeWatch } from "@/lib/watch/store";
import { DEVICE_ID_PATTERN } from "@/lib/watch/types";

function deviceFrom(request: Request): string | null {
  const id = request.headers.get("x-device-id") ?? "";
  return DEVICE_ID_PATTERN.test(id) ? id : null;
}

const err = (code: string, status: number) =>
  NextResponse.json({ error: code }, { status });

const AddSchema = z.object({
  mint: SolanaMintSchema,
  symbol: z.string().max(32).nullable().optional(),
  name: z.string().max(64).nullable().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  const device = deviceFrom(request);
  if (!device) return err("invalid_device", 400);
  try {
    return NextResponse.json({ watches: await listWatches(device) });
  } catch (e) {
    console.error("watch list failed:", e);
    return err("storage_unavailable", 503);
  }
}

export async function POST(request: Request) {
  const device = deviceFrom(request);
  if (!device) return err("invalid_device", 400);

  const parsed = AddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err("invalid_body", 400);

  try {
    const r = await addWatch(device, {
      mint: parsed.data.mint,
      symbol: parsed.data.symbol ?? null,
      name: parsed.data.name ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
    });
    if (!r.ok) return err("watch_limit_reached", 409);
    return NextResponse.json({ watch: r.entry });
  } catch (e) {
    console.error("watch add failed:", e);
    return err("storage_unavailable", 503);
  }
}

export async function DELETE(request: Request) {
  const device = deviceFrom(request);
  if (!device) return err("invalid_device", 400);

  const body = await request.json().catch(() => null);
  const mint = SolanaMintSchema.safeParse(body?.mint);
  if (!mint.success) return err("invalid_body", 400);

  try {
    await removeWatch(device, mint.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("watch remove failed:", e);
    return err("storage_unavailable", 503);
  }
}
