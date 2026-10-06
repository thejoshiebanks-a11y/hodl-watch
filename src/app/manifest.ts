import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HODL",
    short_name: "HODL",
    description: "Real-time Solana token intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#050b24",
    theme_color: "#050b24",
    icons: [
      { src: "/pwa-icon?s=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?s=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?s=512&m=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
