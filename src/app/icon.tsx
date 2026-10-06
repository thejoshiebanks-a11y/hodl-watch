/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { hodlLogoDataUri } from "@/lib/brand-svg";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <img src={hodlLogoDataUri} width={64} height={64} alt="" />,
    size,
  );
}
