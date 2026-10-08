# Architecture

HODL watches Solana tokens. It never holds funds, never asks for a wallet, and never gives buy or sell advice. The user decides.

## Flow

    paste mint -> validate -> provider adapters -> normalized market + identity
      -> Health (factors, caps) -> scan result (cached)

    watch a token -> scheduled scan -> snapshot compare -> material events
      -> user rules -> push alert

## Layers

- `src/lib/providers/` fetches data (market, candles, risk). The app never calls a provider directly from a page.
- `src/lib/scan/` runs and caches a scan. `src/app/api/scan` is the public entry.
- `src/health/` is the deterministic Health engine: factors, group scores, caps, versioned config.
- `src/lib/watch/` holds watchlists, snapshots, event detection, alert rules and settings.
- `src/lib/push/` sends web-push notifications. `src/lib/social/` handles X posts.
- `src/app/api/` has the routes. Scheduled work runs through `/api/cron/scan`, called by cron-job.org.

## Storage

Redis (Upstash, via the KV_REST variables). Main keys: a watchlist hash per device, a watchers set per token, one snapshot per token, a capped event list per token (50 newest), push subscriptions per device and a short-lived cooldown key per alert.

## Identity of a user

There are no accounts. Each browser gets a random device ID kept in local storage. "Link another device" lets a second browser adopt the first one's ID using a one-time 6-character code that lasts 10 minutes.

## Principles

- Missing data is N/A, never zero.
- Raw observations and interpreted events are separate.
- Health is versioned. Historical scores keep their version.
- If data is degraded, the UI says so (data banner).
