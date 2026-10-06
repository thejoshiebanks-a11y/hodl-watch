import { ImageResponse } from "next/og";

export function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("s"));
  const s = [180, 192, 512].includes(raw) ? raw : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4ed8, #38d6ff)",
          color: "white",
          fontSize: s * 0.6,
          fontWeight: 800,
        }}
      >
        H
      </div>
    ),
    { width: s, height: s },
  );
}
