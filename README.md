# HODL

Health · Observe · Detect · Live

Paste a Solana token address. HODL scores its current market health from 0 to 10, shows the evidence behind the score, and can watch the token and ping you when something material changes.

HODL watches. The user decides. It never connects a wallet, swaps, or tells you what to buy or sell.

## What it does

- Scan: Health score with factor breakdown, caps and explanation, plus live chart and identity facts.
- Watch: a per-device watchlist with scheduled re-scans, alert rules and web push.
- Your Mark: save a token's price and Health, then see what changed.
- Posted CA: whether the token's linked X account posted its address.
- Share: public pages at /t/<mint> with a preview card.
- Device linking: share one watchlist across browsers with a one-time code.

## Run it

    npm install
    cp .env.example .env.local   # fill in the values
    npm run dev

Checks before a commit:

    npx tsc --noEmit && npm run lint && npx vitest run

## Environment

Names are listed in .env.example. Values stay in Vercel and .env.local and are never committed.

## Docs

- docs/architecture.md
- docs/data-sources.md
- docs/events.md
- docs/detection.md
- docs/limitations.md
- docs/health.md
- SECURITY.md

## Deploy

Vercel, with a cron job calling /api/cron/scan.
