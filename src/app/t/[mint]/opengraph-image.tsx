/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { hodlLogoDataUri } from "@/lib/brand-svg";
import { bandColorOf, bandOf, shareInfo, siteUrl } from "@/lib/share";

export const alt = "HODL Health score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60;

function ringUri(score: number | null, color: string): string {
  const r = 120;
  const c = 2 * Math.PI * r;
  const dash = ((score ?? 0) / 10) * c;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">` +
    `<circle cx="150" cy="150" r="${r}" stroke="#1b2a5a" stroke-width="22"/>` +
    `<circle cx="150" cy="150" r="${r}" stroke="${color}" stroke-width="22" stroke-linecap="round" stroke-dasharray="${dash} ${c}" transform="rotate(-90 150 150)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default async function Image({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const info = await shareInfo(mint);
  const score = info?.score ?? null;
  const color = bandColorOf(score);
  const symbol = info?.symbol ? `$${info.symbol}`.slice(0, 13) : "HODL";
  const name = (info?.name ?? "Solana token intelligence").slice(0, 30);
  const host = siteUrl().replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg,#08143a,#02040c)",
          color: "#e8eeff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={hodlLogoDataUri} width={72} height={72} alt="" />
            <div style={{ display: "flex", marginLeft: 20, fontSize: 40, fontWeight: 800, letterSpacing: 8 }}>HODL</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 104, fontWeight: 800 }}>{symbol}</div>
            <div style={{ display: "flex", fontSize: 38, color: "#7f8fbf", marginTop: 8 }}>{name}</div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#7f8fbf" }}>{`Scan any Solana token at ${host}`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", position: "relative", width: 300, height: 300, alignItems: "center", justifyContent: "center" }}>
            <img src={ringUri(score, color)} width={300} height={300} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
            <div style={{ display: "flex", fontSize: 96, fontWeight: 800 }}>{score === null ? "N/A" : score.toFixed(1)}</div>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 36, fontWeight: 800, color }}>
            {info ? bandOf(score) : "SCAN A TOKEN"}
          </div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "#7f8fbf" }}>Health score out of 10</div>
        </div>
      </div>
    ),
    size,
  );
}
