# HODL Health v0.1 — Scoring Methodology

## Status

Proposed methodology for `health-v0.1`.

This document defines the initial deterministic Health model. Thresholds and weights are explicit so they can be tested, reviewed, and changed only through a new methodology version.

## Purpose

HODL Health compresses observable token conditions into a 0–10 condition score.

It is not:

- a buy signal
- a sell signal
- a prediction
- a profitability estimate
- a ranking of tokens
- a recommendation

A higher Health score means the observed conditions currently satisfy more of HODL's defined stability and structural criteria. It does not mean the token will increase in price.

## Core rules

1. Every scored observation must have a documented normalization rule.
2. Missing observations are unavailable, never zero.
3. A factor cannot improve Health merely because data is missing.
4. Positive price movement must not automatically increase Health.
5. Large adverse movement must reduce Health.
6. Extreme price movement in either direction may represent instability and must not automatically receive a perfect score.
7. Every score must be reproducible from the stored observations.
8. Every score carries a methodology version.
9. Every score change must have an explanation.
10. Identity and social badges remain separate from Health unless explicitly added to a future methodology.

## Health groups

### TAPE

Measures recent price stability.

Initial observations:

- 5m price change
- 1h price change

The tape model is intended to measure stability rather than reward momentum.

A flat or moderately moving tape should score better than an extreme move in either direction.

Large negative movement receives additional downside penalty because it represents direct deterioration in observed market condition.

Large positive movement does not receive a corresponding Health reward.

### LIQUIDITY

Measures the market's current ability to absorb activity.

Initial observations:

- USD liquidity
- liquidity relative to market capitalization when both values are available

Liquidity observations must remain independent from price direction.

### FLOW

Measures buy/sell and wallet flow.

Health v0.1 does not score Flow because the current provider layer does not yet supply sufficiently reliable normalized buy/sell flow observations.

Flow remains `N/A`.

### STRUCTURE

Measures observable token structural conditions.

Initial observations:

- mint authority
- freeze authority
- top-holder concentration

Holder count is retained as an observation but is not independently scored in v0.1 because raw holder count is highly dependent on token age, activity, and market context.

## Missing data and coverage

Each factor is independently available or unavailable.

Unavailable factors:

- do not contribute points
- do not contribute negative points
- reduce coverage

Coverage is:

`available scored factors / total defined scored factors`

The implementation must never substitute zero for an unavailable factor.

## Factor normalization

Every normalized factor produces a value from 0 to 10.

The normalization function must:

- be deterministic
- be bounded between 0 and 10
- handle extreme values safely
- preserve `N/A`
- have tests for boundary conditions

Thresholds are methodology parameters, not arbitrary implementation details.

Changing a threshold changes the methodology and therefore requires a new Health version.

## Group aggregation

Each Health group produces a group score from its available factors.

A group with no available factors is `N/A`.

A group with partially available factors uses only available factors and reports its coverage.

The final Health score must account for group availability rather than silently treating an unavailable group as zero.

## Versioning

Current methodology identifier:

`health-v0.1`

Any change to:

- factor definitions
- normalization
- thresholds
- weights
- missing-data handling
- aggregation rules

requires a new methodology version.

## Current implementation status

The existing tape normalization in `src/health/factors/tape.ts` is provisional scaffolding and must not be treated as the final v0.1 methodology.

The existing group weights in `src/health/score/config.ts` are also provisional until the aggregation model is implemented and tested.

## Future methodology work

Future versions may introduce:

- buy/sell flow
- pool liquidity changes
- creator balance changes
- wallet concentration changes
- bundler/sniper observations
- historical volatility
- pool-level structure
- multi-pair liquidity
- time-series stability

Each addition must be documented and versioned.

## Liquidity reference parameters

Health v0.1 currently uses two liquidity observations.

### Absolute liquidity

Absolute USD liquidity is normalized logarithmically using:

- $1,000 as the lower reference point
- $100,000 as the midpoint region
- $10,000,000 as the upper reference point

Values below the lower reference point remain bounded at 0. Values above the upper reference point continue to increase only until the 10-point ceiling.

These are methodology reference points, not claims that a particular liquidity level is universally safe or sufficient.

### Liquidity relative to market capitalization

The liquidity/market-cap ratio uses:

- 1% as the lower reference point
- 50% as the upper reference point

The ratio is logarithmically normalized between those references and bounded at 0–10.

A 10/10 factor contribution means the observation is at or above the upper reference point. It does not mean the market is risk-free or guaranteed to be liquid under stress.

### Calibration status

These parameters are initial v0.1 methodology parameters.

They should be evaluated against observed historical token conditions before being treated as empirically calibrated thresholds.

Changing these reference parameters requires a new Health methodology version.

## Aggregation and coverage

Health v0.1 aggregates available factor groups using the configured group weights.

A group with no available scored factors is excluded from the weighted score rather than treated as zero.

When one or more groups are unavailable, the weights of the available groups are renormalized across the active groups. This prevents missing data from becoming an implicit negative score.

For each available group:

`group score = mean of available factor scores`

The final score is:

`final score = weighted mean of available group scores`

using only groups with at least one available scored factor.

### Coverage

Coverage is reported separately from the Health score.

`coverage = available scored factors / total defined scored factors`

An unavailable factor reduces coverage but contributes neither positive nor negative points.

This distinction is intentional:

- Health measures the conditions that can actually be scored.
- Coverage measures how complete the underlying observation set is.

A high Health score with low coverage must not be interpreted as equivalent to a high Health score with complete observations.

Changing aggregation behavior, group weighting, or coverage semantics requires a new Health methodology version.

## STRUCTURE normalization

Health v0.1 treats structural observations as independent factors.

### Mint and freeze authority

Authority status is normalized as follows:

- `REVOKED` → 10/10
- `SET` → 0/10
- `UNKNOWN` → `N/A`

A revoked authority means the corresponding authority is no longer active. A set authority means the authority remains present. These scores describe the observed token structure only; they do not establish that a token is safe or unsafe.

Mint authority and freeze authority are evaluated independently when both observations are available.

The combined authority factor is the mean of the available authority scores.

If both authority observations are unavailable, the authority factor is `N/A`.

### Top-holder concentration

Top-holder concentration is normalized using explicit concentration reference points:

- 10% or below → 10/10
- 50% or above → 0/10

Between these reference points, the factor decreases linearly as concentration increases.

Values are bounded to the 0–10 range.

These reference points are methodology parameters rather than universal safety thresholds. A lower concentration score does not establish that ownership is safe, while a higher concentration score does not establish that a token is safe or unsafe overall.

If top-holder concentration is unavailable, the factor is `N/A`.

### Structure aggregation

The STRUCTURE group is the mean of its available scored factors:

- authority status
- top-holder concentration

Unavailable structure observations do not contribute zero and only reduce coverage.

Changing authority scoring, concentration reference points, or structure aggregation requires a new Health methodology version.
