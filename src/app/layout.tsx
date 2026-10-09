import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { siteUrl } from "@/lib/share";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "HODL | Solana token intelligence",
  description: "Scan any Solana token for an explainable Health score, a live chart and the evidence behind it.",
  openGraph: {
    type: "website",
    siteName: "HODL",
    title: "HODL | Solana token intelligence",
    description: "Scan any Solana token for an explainable Health score, a live chart and the evidence behind it.",
    images: [{ url: "/og.png", width: 1280, height: 640, alt: "HODL. You trade. HODL watches." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HODL | Solana token intelligence",
    description: "Scan any Solana token for an explainable Health score, a live chart and the evidence behind it.",
    images: ["/og.png"],
  },
  appleWebApp: { capable: true, title: "HODL", statusBarStyle: "black" },
  icons: { apple: "/pwa-icon?s=180" },
};

export const viewport: Viewport = { themeColor: "#050b24" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html suppressHydrationWarning
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
