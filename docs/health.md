# HODL Health (current: health-v0.3.0)

## Purpose

Health is a deterministic 0-10 measurement of observable token conditions. It is not a buy or sell signal, a prediction or a trade call.

## Principles

1. Every scored input is observable and documented.
2. Missing data is N/A, never silently zero.
3. A score can be reproduced from its observations.
4. Every score change can be explained.
5. Health is versioned. Old scores keep the version that produced them.
6. Identity badges and social signals (such as Posted CA) are separate from Health.
7. No KOL rankings, narratives, clone counts or trading recommendations feed Health.

## How the score is made

1. Each check turns one observation into a 0-10 value, or N/A when the data is missing.
2. A domain score is the average of its available checks.
3. The base score is the weighted average of the domains that have data. Weights are re-normalised over those domains, so a missing domain does not count as zero.
4. Caps then set a ceiling. The final score is the lower of the base score and the lowest ceiling that applies.

Final score = min(base score, lowest cap), rounded to two decimals.

## Domains and weights

| Domain | Weight | Question |
| --- | --- | --- |
| Market | 15% | What is price actually doing? |
| Liquidity | 25% | Can the market absorb trading? |
| Flow | 15% | Who is buying and selling? |
| Holders | 15% | Who owns the supply? |
| Creator | 10% | Is the creator a risk? |
| Security | 15% | Can the contract hurt holders? |
| Lifecycle | 5% | How mature is the token? |

28 checks in total. Each check's measurement and scoring is listed on the public Methodology page, whose source is `src/health/methodology.ts`.

## Coverage

- Coverage is the share of checks that were observed.
- Below 60% the result is labelled Partial and capped at 6.0.
- If Security or Liquidity has no data at all, Health is also capped at 5.0 ("could not be checked"). Unknowns count against a token instead of quietly dropping out.

## Caps

A serious red flag sets a maximum the score cannot exceed, whatever the average says. Examples: rugged flag, large 24h or 1h falls, collapsed liquidity, thin liquidity, mint or freeze authority still set, transfer fees, concentrated or insider supply, very young pools, sell-led flow.

- The full list with ceilings is `CAPS` in `src/health/methodology.ts`. The rules are in `src/health/score/caps.ts`.
- Caps are provisional until calibrated.
- A fall in 24h is judged by what is left: if liquidity and the holder base held, the ceiling is higher, and higher again if price has steadied.
- Fresh launches whose liquidity is not indexed yet get a fresh-launch ceiling instead of being treated as drained.
- Bonding-curve tokens (pump.fun, not yet graduated) use curve reserves and skip drained-pool caps.

## What Health is not

It does not include Posted CA, clones, social posts or alerts. Those are identity and Observe signals.

## Version history

See `VERSION_HISTORY` in `src/health/methodology.ts`.
