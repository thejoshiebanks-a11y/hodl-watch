# HODL Health v0.1

## Purpose

Health is a deterministic 0–10 measurement of observable token conditions.

It is not a buy/sell signal, prediction, recommendation, or trade call.

## Principles

1. Every scored input must be observable and documented.
2. Missing data is `N/A`, never silently converted to zero.
3. Every Health score must be reproducible from its observations.
4. Every score change must be explainable.
5. Health is versioned. Historical scores retain the methodology version that produced them.
6. Identity badges and social signals are separate from Health unless explicitly defined as Health inputs.
7. No KOL rankings, narratives, posted-CA status, clone counts, or trading recommendations are included in Health v0.1.

## Factor groups

### TAPE

Measures observable price behavior.

Initial observations:

- 5m price change
- 1h price change

### LIQUIDITY

Measures current market liquidity.

Initial observations:

- USD liquidity
- Liquidity relative to market cap when both values are available

### FLOW

Measures buy/sell and wallet flow.

Health v0.1 does not score flow until reliable buy/sell flow observations are available.

Unavailable flow observations remain `N/A`.

### STRUCTURE

Measures token structural conditions.

Initial observations:

- Mint authority status
- Freeze authority status
- Top-holder concentration when available
- Holder count when available

## Missing data

A missing observation must remain explicitly unavailable.

The Health engine must never interpret:

- missing liquidity as zero liquidity
- missing flow as negative flow
- missing holder data as zero holders
- unknown authority status as revoked or active

## Versioning

The initial methodology identifier is:

`health-v0.1`

Any future change to factor definitions, normalization, weights, thresholds, or missing-data handling requires a new methodology version.

## Future additions

Later versions may add:

- pool liquidity changes
- buy/sell flow
- creator balance changes
- wallet concentration changes
- bundler/sniper observations
- historical volatility
- market-structure observations

These must be added through documented methodology changes rather than silently changing the meaning of an existing score.
