import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "./Footer";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-hodl-muted">{children}</div>
    </section>
  );
}

export function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden text-hodl-text">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <Link href="/" className="text-sm text-hodl-cyan">
          ← Back to HODL
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-hodl-muted">{subtitle}</p>}
        <div className="mt-8 space-y-8">{children}</div>
        <Footer />
      </div>
    </main>
  );
}
