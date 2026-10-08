# Contributing

Thanks for looking. HODL is small and moving fast, so open an issue before a large change.

## Setup

    npm install
    cp .env.example .env.local   # fill in the values you have
    npm run dev

## Before a pull request

    npx tsc --noEmit && npm run lint && npx vitest run

## Ground rules

- Missing data is N/A, never zero.
- Health stays deterministic and versioned. A scoring change needs tests and a `VERSION_HISTORY` entry.
- No buy or sell wording, and no trade signals, anywhere in the product.
- Never commit secrets. Report security issues as described in SECURITY.md.
