# Events (Observe)

HODL turns raw changes into a short list of material events. It does not show every trade.

## How an event is made

A scheduled scan compares the new snapshot with the last stored one. A change that crosses a threshold becomes an event with a kind, severity (critical, warning, info), a title, a detail line and sometimes a value or link.

## Storage

Events are stored per token, newest first, 50 at most. Events from X posts carry a link and use a unique key so two posts at the same time are not merged.

## Kinds

The full list is the alert catalog in `src/lib/watch/alert-catalog.ts`. It is the source of truth. Categories:

- Contract and safety: rugged flag, mint or freeze authority set again, transfer fee, possible exit pattern.
- Liquidity: drops, additions, locked liquidity falling, pools added or removed.
- Price and volume: drops, rises, volume spikes, flow turning sell-led or buy-led.
- Holders and wallets: creator selling, top holder growing, holder count falling, insider supply growing, whale buys and sells.
- Health score changes.
- X posts: a tracked account posted the token's address (verified), or only its $symbol (unconfirmed).

## Noise control

- The same alert for the same token and device is sent at most once every 30 minutes.
- X posts: same account and same token once per 30 minutes, and a post is processed once.
