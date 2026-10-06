import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-hodl-line pt-4 text-[11px] leading-relaxed text-hodl-muted">
      <p>
        HODL shows observed data and a Health score. It is not financial advice and
        does not predict price.
      </p>
      <p className="mt-2 flex gap-4">
        <Link href="/methodology" className="text-hodl-cyan">Methodology</Link>
        <Link href="/terms" className="text-hodl-cyan">Terms</Link>
        <Link href="/privacy" className="text-hodl-cyan">Privacy</Link>
      </p>
    </footer>
  );
}
