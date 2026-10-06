import type { Metadata } from "next";
import { LegalShell, Section } from "@/components/LegalShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms | HODL",
  description: "Terms of use for HODL.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" subtitle={`Last updated ${SITE.updated}`}>
      <Section title="What HODL is">
        <p>
          HODL is a read-only tool that scans Solana tokens and reports observed data and a Health
          score. It does not trade, hold funds, connect to wallets, or tell you to buy, sell or
          hold anything.
        </p>
      </Section>

      <Section title="Not financial advice">
        <p>
          Nothing in HODL is financial, investment, legal or tax advice. Health scores and alerts
          describe what was observed. They do not predict price and they do not guarantee that a
          token is safe.
        </p>
        <p>
          Trading memecoins is very high risk. You can lose everything you put in. Any decision to
          trade is yours alone.
        </p>
      </Section>

      <Section title="Data can be wrong or late">
        <p>
          HODL relies on third-party data sources. That data can be delayed, incomplete or wrong,
          and missing data is shown as N/A. Alerts come from scans about every 5 minutes, so they
          can arrive late or be missed. Do not use HODL as your only source of information.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          HODL is provided as is, without warranties of any kind. It may change, be interrupted or
          be withdrawn at any time, and free data sources may limit what it can show.
        </p>
      </Section>

      <Section title="Limit of liability">
        <p>
          To the extent the law allows, HODL and its operator are not liable for any loss or
          damage arising from your use of, or reliance on, HODL.
        </p>
      </Section>

      <Section title="Tokens associated with HODL">
        <p>
          Any token that uses the HODL name or is associated with this project is separate from
          this service. Using HODL does not require holding any token, and holding one gives no
          access, discounts, ownership, revenue share or influence over HODL scores.
        </p>
        <p>
          The operator of HODL may receive creator fees from such a token. That is a financial
          interest in that token. It does not change how scores are calculated, which follow the
          published methodology.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          These terms may be updated. The date at the top shows the latest version. Continuing to
          use HODL means you accept the current terms.
        </p>
      </Section>

      {SITE.contactEmail && (
        <Section title="Contact">
          <p>{SITE.contactEmail}</p>
        </Section>
      )}
    </LegalShell>
  );
}
