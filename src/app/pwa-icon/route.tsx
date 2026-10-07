/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { hodlBadgeDataUri, hodlIconDataUri } from "@/lib/brand-icon";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = Number(params.get("s"));
  const s = [96, 180, 192, 512].includes(raw) ? raw : 192;

  // Android status-bar badge: white mark on transparent.
  if (params.get("b") === "1") {
    return new ImageResponse(<img src={hodlBadgeDataUri} width={s} height={s} alt="" />, {
      width: s,
      height: s,
    });
  }

  // Maskable icons need extra padding so Android's crop never cuts the logo.
  const maskable = params.get("m") === "1";
  const src = maskable ? hodlIconDataUri(5.2, false) : hodlIconDataUri(6.6, true);
  return new ImageResponse(<img src={src} width={s} height={s} alt="" />, {
    width: s,
    height: s,
  });
}
