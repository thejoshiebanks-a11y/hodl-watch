import type { Metadata } from "next";
import { LegalShell, Section } from "@/components/LegalShell";
import type { HealthGroup } from "@/health/factors/types";
import { CAPS, CHECKS, DOMAIN_INFO, VERSION_HISTORY } from "@/health/methodology";
import {
  HEALTH_GROUP_WEIGHTS,
  HEALTH_VERSION,
  PARTIAL_COVERAGE_BELOW,
} from "@/health/score/config";

export const metadata: Metadata = {
  title: "Methodology | HODL",
  description:
    "Every check, weight and threshold behind the HODL Health score, with version history.",
};

const DOMAINS = Object.keys(HEALTH_GROUP_WEIGHTS) as HealthGroup[];

export default function MethodologyPage() {
  return (
    <LegalShell
      title="How HODL Health works"
      subtitle={`Current version: ${HEALTH_VERSION}. ${CHECKS.length} checks across ${DOMAINS.length} domains.`}
    >
      <Section title="What Health is">
        <p>
          Health is a 0 to 10 snapshot of the observable condition of a Solana token and its
          market, built only from data HODL could actually see at scan time.
        </p>
        <p>
          It is not a prediction. A high score does not mean a token will go up, and a low score
          does not mean it will fail. It is not financial advice.
        </p>
        <p>
          When data is missing, the check shows N/A and is left out of the average. It is never counted as zero. But a token whose Security or Liquidity could not be checked, or with under 60% of checks observed, is capped (see Score caps), so unknowns cannot make a token look healthy.
        </p>
      </Section>

      <Section title="How the score is built">
        <p>
          Each check scores 0 to 10. A domain score is the average of its observed checks. The
          overall score is the weighted average of the observed domains, with the weights
          re-scaled to the domains that had data.
        </p>
        <div className="hodl-card divide-y divide-white/10 text-sm">
          {DOMAINS.map((d) => (
            <div key={d} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-hodl-text">{DOMAIN_INFO[d].label}</span>
              <span>{Math.round(HEALTH_GROUP_WEIGHTS[d] * 100)}%</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Score caps">
        <p>
          An average can hide a serious problem, so certain red flags set a ceiling. The final
          score is the lower of the average and the lowest ceiling that applies. A rugged token can
          never score above 1, whatever else looks fine. The score screen shows which cap applied.
        </p>
        <p>
          The ceilings are provisional. Flags that compare against a recorded peak apply only to
          tokens that have been on a watchlist, because that is when HODL records the peak.
        </p>
        <div className="hodl-card divide-y divide-white/10 text-sm">
          {CAPS.map((c) => (
            <div key={c.flag} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-hodl-text">{c.flag}</span>
              <span className="shrink-0">max {c.ceiling}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Coverage and the Partial label">
        <p>
          Coverage is the share of checks that were observed. When coverage is under{" "}
          {Math.round(PARTIAL_COVERAGE_BELOW * 100)}%, or when Liquidity or Security could not be
          observed at all, HODL labels the result Partial instead of giving it a confident label.
        </p>
        <p>
          Otherwise the display label comes from the score: 7.5 and above is Healthy, 5.5 and above
          is Mixed, 3.5 and above is Weak, and anything lower is Poor. The labels are for display
          and do not change the score.
        </p>
      </Section>

      {DOMAINS.map((d) => (
        <Section key={d} title={`${DOMAIN_INFO[d].label} (${Math.round(HEALTH_GROUP_WEIGHTS[d] * 100)}%)`}>
          <p>{DOMAIN_INFO[d].question}</p>
          <div className="hodl-card divide-y divide-white/10">
            {CHECKS.filter((c) => c.domain === d).map((c) => (
              <div key={c.key} className="px-4 py-3">
                <p className="text-sm font-semibold text-hodl-text">{c.label}</p>
                <p className="mt-1 text-xs">{c.measures}</p>
                <p className="mt-1 text-xs">
                  <span className="text-hodl-cyan">Scoring:</span> {c.scoring}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ))}

      <Section title="Data sources">
        <p>
          Market data comes from DexScreener, chart candles from GeckoTerminal, and holder, lock and
          contract data from RugCheck. These are third parties. Their data can be late, incomplete
          or wrong, and HODL cannot verify it independently.
        </p>
      </Section>

      <Section title="Known limits">
        <p>
          Thresholds are provisional and will change as HODL learns from real tokens. Every change
          raises the version number below.
        </p>
        <p>
          HODL does not yet see wallet-level activity such as whale sells or sniper clusters.
          Alerts compare scans taken about every 5 minutes, so fast moves between scans can be
          missed or reported late.
        </p>
      </Section>

      <Section title="Version history" id="version-history">
        <div className="hodl-card divide-y divide-white/10">
          {VERSION_HISTORY.map((v) => (
            <div key={v.version} className="px-4 py-3">
              <p className="text-sm font-semibold text-hodl-text">{v.version}</p>
              <p className="mt-1 text-xs">{v.notes}</p>
            </div>
          ))}
        </div>
      </Section>
    </LegalShell>
  );
}
