# Data sources

| Source | Used for |
| --- | --- |
| DexScreener | Price, liquidity, volume, trades, pair age, linked websites and socials |
| GeckoTerminal | Backup market data and token images when DexScreener has nothing |
| RugCheck | Mint and freeze authority, holders, insiders, LP lock, rugged flag, risk flags |
| Helius webhook | Whale buys and sells |
| X API (pay per post) | Posts from tracked accounts, and the "Posted CA" check |
| Upstash Redis | Watchlists, snapshots, events, push subscriptions, cooldowns |

## Rules

- Providers sit behind adapters, so one can be replaced without rewriting the product.
- The backup market source has no social links, so "Posted CA" shows Unknown while it is answering.
- Every provider response is validated before use. Anything missing becomes N/A.

## X spending

- Reads are billed per post returned. A search with no matches costs nothing.
- Daily cap: 30 posts (about $0.15). It covers both alert scans and Posted CA lookups.
- Alert scans run at most every 4 minutes and use at most 24 searches.
