import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SolanaMintSchema } from "@/lib/validation/solana";
import { describeShare, shareInfo } from "@/lib/share";
import { OpenToken } from "./OpenToken";

export const revalidate = 60;

type Props = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mint } = await params;
  const { title, description } = describeShare(await shareInfo(mint));
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `/t/${mint}`, siteName: "HODL", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const { mint } = await params;
  if (!SolanaMintSchema.safeParse(mint).success) notFound();
  const info = await shareInfo(mint);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-hodl-text">
      <OpenToken mint={mint} />
      <div className="w-full max-w-sm rounded-3xl border border-hodl-line p-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-hodl-muted">HODL · Solana token intelligence</p>
        <p className="mt-4 text-2xl font-bold">{info?.name ?? "Token"}</p>
        {info?.symbol && <p className="text-hodl-muted">${info.symbol}</p>}
        <p className="mt-4 text-5xl font-bold">
          {info && info.score !== null ? info.score.toFixed(1) : "N/A"}
          <span className="text-lg text-hodl-muted"> /10</span>
        </p>
        <a
          href={`/?token=${mint}`}
          className="mt-6 inline-block rounded-xl bg-hodl-cyan/90 px-5 py-3 text-sm font-semibold text-black"
        >
          Open in HODL
        </a>
      </div>
    </main>
  );
}
