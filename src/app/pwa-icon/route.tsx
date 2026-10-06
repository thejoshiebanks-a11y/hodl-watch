/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { hodlLogoDataUri } from "@/lib/brand-svg";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = Number(params.get("s"));
  const s = [180, 192, 512].includes(raw) ? raw : 192;
  // Maskable icons need extra padding so Android's crop never cuts the logo.
  const maskable = params.get("m") === "1";
  const logo = Math.round(s * (maskable ? 0.5 : 0.64));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050b24",
        }}
      >
        <img src={hodlLogoDataUri} width={logo} height={logo} alt="" />
      </div>
    ),
    { width: s, height: s },
  );
}
