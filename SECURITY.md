# Security

HODL shows observed on-chain and market data and a Health score. It never holds user funds, never asks for a wallet connection and never asks for private keys.

## Reporting a problem

If you find a security issue, please report it privately using GitHub's "Report a vulnerability" option on this repository's Security tab, or through the contact link in the site footer. Please don't open a public issue for it.

Include what you found, how to reproduce it, and which page or API route is affected. We'll acknowledge the report and fix confirmed issues as quickly as we can.

## What we ask of you

- Don't access, change or delete other people's data.
- Don't run load or denial-of-service tests against the live site.
- Give us reasonable time to fix an issue before sharing it publicly.

## Secrets

API keys and tokens live only in environment variables (Vercel and `.env.local`). They are never committed. `.env.example` lists the names but never the values.
