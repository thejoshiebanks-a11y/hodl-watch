import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

const LABELS: Record<string, string> = {
  x: "X",
  telegram: "Telegram",
  github: "GitHub",
};

const link = "block py-1 text-hodl-muted transition-colors hover:text-hodl-cyan";

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hodl-text">
        {title}
      </p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

export function Footer() {
  const social = Object.entries(SITE.social).filter(([, url]) => url);

  return (
    <footer className="mt-12 border-t border-hodl-line pt-8">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <p className="bg-gradient-to-r from-white to-hodl-cyan bg-clip-text text-lg font-extrabold tracking-[0.2em] text-transparent">
            HODL
          </p>
          <p className="mt-2 text-xs leading-relaxed text-hodl-muted">
            You trade. HODL watches. Real-time Solana token intelligence.
          </p>
        </div>

        <Col title="Product">
          <Link href="/methodology" className={link}>
            Methodology
          </Link>
          <Link href="/methodology#version-history" className={link}>
            Version history
          </Link>
        </Col>

        <Col title="Legal">
          <Link href="/terms" className={link}>
            Terms of use
          </Link>
          <Link href="/privacy" className={link}>
            Privacy
          </Link>
        </Col>

        {SITE.contactEmail && (
          <Col title="Help">
            <a href={`mailto:${SITE.contactEmail}`} className={link}>
              Contact
            </a>
          </Col>
        )}

        {social.length > 0 && (
          <Col title="Social">
            <div className="flex flex-wrap gap-2 pt-1">
              {social.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-hodl-line px-3 py-1 text-xs text-hodl-muted transition-colors hover:text-hodl-cyan"
                >
                  {LABELS[key] ?? key}
                </a>
              ))}
            </div>
          </Col>
        )}
      </div>

      <div className="mt-8 border-t border-hodl-line pt-4 text-[11px] leading-relaxed text-hodl-muted">
        <p>
          HODL shows observed data and a Health score. It is not financial advice and does
          not predict price. Trading memecoins is very high risk.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} HODL</p>
        <p className="mt-2">
          Charts powered by{" "}
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-hodl-cyan"
          >
            TradingView
          </a>{" "}
          Lightweight Charts™.
        </p>
      </div>
    </footer>
  );
}
