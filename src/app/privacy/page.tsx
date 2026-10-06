import type { Metadata } from "next";
import { LegalShell, Section } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy | HODL",
  description: "What HODL stores and what it does not.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" subtitle={`Last updated ${SITE.updated}`}>
      <Section title="What HODL stores">
        <p>
          HODL has no accounts. Your browser creates a random device ID and keeps it in local
          storage. HODL saves these against that ID: your watchlist, which tokens you muted, your
          alert level, and, if you turn alerts on, your browser push subscription.
        </p>
        <p>
          Market snapshots and detected changes are stored per token, not per person, and are
          built from public data.
        </p>
      </Section>

      <Section title="What HODL does not collect">
        <p>
          HODL does not ask for your name or email, does not connect to wallets and never sees your
          wallet address. It does not include advertising or analytics scripts.
        </p>
      </Section>

      <Section title="Your IP address">
        <p>
          Your IP address is used for about a minute to limit abuse, such as too many scans in a
          short time. It is not saved with your watchlist.
        </p>
      </Section>

      <Section title="Services HODL relies on">
        <p>
          The site is hosted on Vercel, which keeps standard request logs under its own policy.
          Saved data lives in an Upstash database. Token addresses you scan are sent to DexScreener,
          GeckoTerminal and RugCheck to fetch data. Push alerts travel through your browser maker
          push service, such as Apple, Google, Mozilla or Microsoft.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          Remove a token from your watchlist to stop watching it. Turn off alerts to delete your
          push subscription. Clearing this site data in your browser removes your device ID, and
          the watchlist saved against it can then no longer be reached.
        </p>
      </Section>

      <Section title="Changes">
        <p>This page may be updated. The date at the top shows the latest version.</p>
      </Section>

      {SITE.contactEmail && (
        <Section title="Contact">
          <p>{SITE.contactEmail}</p>
        </Section>
      )}
    </LegalShell>
  );
}
