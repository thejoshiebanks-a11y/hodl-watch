import { NextResponse } from "next/server";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { runScan } from "@/lib/scan/run";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = SolanaMintSchema.safeParse(body?.mint);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid Solana mint address", code: "INVALID_MINT" },
        { status: 400 },
      );
    }

    const outcome = await runScan(result.data);

    if (!outcome.ok) {
      return NextResponse.json(
        {
          error: "No Solana market pair found for this mint",
          code: "TOKEN_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: outcome.data });
  } catch (error) {
    console.error("Scan failed:", error);

    return NextResponse.json(
      { error: "Unable to complete scan", code: "SCAN_FAILED" },
      { status: 502 },
    );
  }
}
