import type { HealthGroup } from "./factors/types";

export const DOMAIN_INFO: Record<HealthGroup, { label: string; question: string }> = {
  MARKET: { label: "Market", question: "What is price actually doing?" },
  LIQUIDITY: { label: "Liquidity", question: "Can the market absorb trading?" },
  FLOW: { label: "Flow", question: "Who is buying and selling?" },
  HOLDERS: { label: "Holders", question: "Who owns the supply?" },
  CREATOR: { label: "Creator", question: "Is the creator a risk?" },
  SECURITY: { label: "Security", question: "Can the contract hurt holders?" },
  LIFECYCLE: { label: "Lifecycle", question: "How mature is the token?" },
};

export type CheckInfo = {
  key: string;
  domain: HealthGroup;
  label: string;
  measures: string;
  scoring: string;
};

export const CHECKS: CheckInfo[] = [
  { key: "market_5m", domain: "MARKET", label: "5m price stability", measures: "How far price moved in the last 5 minutes, in either direction.", scoring: "10 when flat, falling smoothly with the size of the move (about 3.7 at a 20% move)." },
  { key: "market_1h", domain: "MARKET", label: "1h price stability", measures: "How far price moved in the last hour.", scoring: "10 when flat; about 3.7 at a 50% move." },
  { key: "market_6h", domain: "MARKET", label: "6h price stability", measures: "How far price moved in the last 6 hours.", scoring: "10 when flat; about 3.7 at an 80% move." },
  { key: "market_24h", domain: "MARKET", label: "24h price stability", measures: "How far price moved in the last 24 hours.", scoring: "10 when flat; about 3.7 at a 150% move." },
  { key: "market_drawdown", domain: "MARKET", label: "Drawdown from 24h high", measures: "How far price sits below its highest point of the last 24 hours (from 15-minute candles).", scoring: "10 at the high; about 3.7 when 40% below it." },
  { key: "market_volatility", domain: "MARKET", label: "Volatility (15m candles)", measures: "The typical candle-to-candle move over 24 hours, scaled to a 15-minute equivalent. Pools under 6 hours old use 5-minute candles.", scoring: "10 when steady; about 3.7 at a 4% typical move." },
  { key: "market_recovery", domain: "MARKET", label: "Recovery from 24h low", measures: "After the largest drop of the last 24 hours, how much of it price has won back.", scoring: "9 when there was no drop of 10% or more. Otherwise 3 (no recovery) up to 10 (fully recovered)." },

  { key: "liquidity_usd", domain: "LIQUIDITY", label: "Absolute liquidity", measures: "Dollar value of liquidity in the pool.", scoring: "Log scale: 0 at $1,000, 10 at $10 million." },
  { key: "liquidity_ratio", domain: "LIQUIDITY", label: "Liquidity / market cap", measures: "Liquidity as a share of market cap.", scoring: "Log scale: 0 at 1%, 10 at 50%." },
  { key: "liquidity_turnover", domain: "LIQUIDITY", label: "24h volume / liquidity", measures: "24h trading volume divided by liquidity.", scoring: "9 from 0.1x to 5x, 6 from 5x to 15x, 5 from 0.02x to 0.1x, 3 above 15x (churn), 2 below 0.02x (dead market)." },
  { key: "liquidity_lp_lock", domain: "LIQUIDITY", label: "LP locked", measures: "Share of liquidity that is locked or burned, weighted across pools (from RugCheck).", scoring: "The locked percentage divided by 10." },
  { key: "liquidity_impact", domain: "LIQUIDITY", label: "Price impact ($1k buy)", measures: "Estimated price impact of a $1,000 buy, assuming an even constant-product pool.", scoring: "10 at no impact; about 3.7 at 10% impact. This is an estimate, not a quote." },

  { key: "flow", domain: "FLOW", label: "Buy/sell flow (1h, 6h fallback)", measures: "Buys versus sells by transaction count over the last hour, or the last 6 hours when the hour has fewer than 20 trades.", scoring: "7 when balanced, 10 when all buys, 0 when all sells. N/A when both windows have fewer than 20 trades." },
  { key: "flow_24h", domain: "FLOW", label: "24h buy/sell flow", measures: "Buys versus sells by transaction count over 24 hours.", scoring: "Same scale as above. N/A under 20 trades." },
  { key: "flow_activity", domain: "FLOW", label: "Trading activity (24h)", measures: "Total number of trades in 24 hours.", scoring: "2 under 50 trades, 5 under 300, 8 under 1,500, 10 above." },
  { key: "flow_wash_volume", domain: "FLOW", label: "24h volume / market cap", measures: "24h trading volume divided by market cap. A very high ratio can mean churn or wash trading, though it cannot prove it.", scoring: "10 at 5x or below, 0 at 60x or above, on a log scale between." },
  { key: "flow_wash_txns", domain: "FLOW", label: "24h trades per holder", measures: "Total trades in 24 hours (buys plus sells) divided by the number of holders. Many trades from few holders can mean a few wallets trading back and forth.", scoring: "10 at 10 trades per holder or fewer, 0 at 100 or more, on a log scale between. N/A under 100 trades." },

  { key: "holders_top", domain: "HOLDERS", label: "Top-holder concentration (excl. pools)", measures: "Share of supply held by the largest holder that is not a known pool.", scoring: "10 at 10% or less, 0 at 50% or more, linear between." },
  { key: "holders_top10", domain: "HOLDERS", label: "Top 10 non-pool holders", measures: "Combined share of supply held by the 10 largest non-pool holders.", scoring: "10 at 15% or less, 0 at 60% or more, linear between." },
  { key: "holders_count", domain: "HOLDERS", label: "Holder count", measures: "Number of holders.", scoring: "Log scale: 0 at 10 holders, 10 at about 3,000." },
  { key: "holders_insiders", domain: "HOLDERS", label: "Insider supply", measures: "Share of supply held by wallets RugCheck links to insiders.", scoring: "10 at 0%, 0 at 25% or more." },

  { key: "creator_rugged", domain: "CREATOR", label: "Rugged flag", measures: "Whether RugCheck marks the token as rugged.", scoring: "0 if rugged, 10 if not." },
  { key: "creator_allocation", domain: "CREATOR", label: "Creator allocation", measures: "Share of supply held by the creator wallet, when it appears among the top holders.", scoring: "9 when the creator is not among the top holders. Otherwise 10 minus half the percentage held (0 at 20%)." },

  { key: "security_authorities", domain: "SECURITY", label: "Mint / freeze authority", measures: "Whether the mint authority (can create more supply) and freeze authority (can freeze wallets) are revoked.", scoring: "10 for each revoked authority, 0 for each still set, averaged." },
  { key: "security_transfer_fee", domain: "SECURITY", label: "Transfer fee", measures: "Whether the token charges a fee on transfers.", scoring: "10 for none. Otherwise 10 minus twice the fee percentage." },
  { key: "security_jupiter", domain: "SECURITY", label: "Jupiter verification", measures: "Whether Jupiter lists the token as verified.", scoring: "9 if verified, 5 if not. This is a listing check, not an endorsement." },

  { key: "lifecycle_token_age", domain: "LIFECYCLE", label: "Token age", measures: "Time since the token was first detected.", scoring: "1 under 1 hour, 3 under 6 hours, 5 under 24 hours, 7 under 3 days, 8.5 under 7 days, 10 after that." },
  { key: "lifecycle_pair_age", domain: "LIFECYCLE", label: "Pool age", measures: "Time since the trading pool was created.", scoring: "Same scale as token age." },
];

export const VERSION_HISTORY: { version: string; notes: string }[] = [
  { version: "health-v0.3.0", notes: "Added wash-trading checks, a holder-count trend and RugCheck risk flags. Tape is now direction-aware and age penalties are softer. Young pools use 5-minute (and 1-minute under 2 hours) candles so market checks are not blank. Fresh launches are not treated as drained pools, and pump.fun bonding-curve tokens use curve reserves. A held 24h fall gets a higher ceiling, and higher again when price has steadied. Early-token ceilings are explained in the UI." },
  { version: "health-v0.2.0", notes: "Added score caps. A serious red flag now sets a ceiling the score cannot exceed, whatever the average says. Missing security or liquidity data and thin coverage also cap the score. Caps are provisional and are shown next to the score." },
  { version: "health-v0.1.2", notes: "Seven domains and 26 checks. Flow falls back to a 6-hour window when the last hour is too thin. Holder checks exclude known pools. Results are labelled Partial when coverage is low or Liquidity or Security was not observed." },
  { version: "health-v0.1.1", notes: "Added buy/sell flow from transaction counts, with N/A below 20 trades." },
  { version: "health-v0.1", notes: "First version: four groups and seven checks." },
];

export type CapInfo = { flag: string; ceiling: string };

// Provisional ceilings. The final score is the lower of the average and the
// lowest ceiling that applies. Keep this list in step with score/caps.ts.
export const CAPS: CapInfo[] = [
  { flag: "RugCheck marks the token as rugged", ceiling: "1.0" },
  { flag: "Price down 70% or more in 24h", ceiling: "2.0" },
  { flag: "Price down 50% or more in 24h", ceiling: "3.5" },
  { flag: "Price down 50% or more in 24h, but liquidity and holders held", ceiling: "5.0" },
  { flag: "Same, and price has steadied over the last 6 hours", ceiling: "6.5" },
  { flag: "Price down 50% or more in 6h", ceiling: "3.0" },
  { flag: "Price down 40% or more in the last hour", ceiling: "3.0" },
  { flag: "Liquidity down 70% or more from its recorded peak", ceiling: "2.0" },
  { flag: "Liquidity down 50% or more from its recorded peak", ceiling: "3.5" },
  { flag: "Price down 80% or more from its recorded peak", ceiling: "2.5" },
  { flag: "Price down 60% or more from its recorded peak", ceiling: "4.0" },
  { flag: "Pool reports no liquidity", ceiling: "1.5" },
  { flag: "Liquidity under $5,000", ceiling: "3.0" },
  { flag: "Liquidity under $20,000", ceiling: "5.5" },
  { flag: "Liquidity unreadable while the token still trades", ceiling: "3.0" },
  { flag: "Fresh launch under 30 minutes, liquidity not indexed yet", ceiling: "5.0" },
  { flag: "Mint authority still set", ceiling: "4.5" },
  { flag: "Freeze authority still set", ceiling: "5.0" },
  { flag: "RugCheck flags permanent control", ceiling: "3.0" },
  { flag: "Transfer fee above 5%", ceiling: "3.0" },
  { flag: "Any transfer fee", ceiling: "5.5" },
  { flag: "One non-pool wallet holds 50% or more", ceiling: "3.0" },
  { flag: "One non-pool wallet holds 30% or more", ceiling: "5.0" },
  { flag: "Insiders hold 40% or more", ceiling: "3.5" },
  { flag: "Insiders hold 20% or more", ceiling: "5.5" },
  { flag: "Pool under 1 hour old", ceiling: "6.0" },
  { flag: "Pool under 24 hours old", ceiling: "7.0" },
  { flag: "Under 30% buys in the last hour (30+ trades)", ceiling: "5.5" },
  { flag: "Security or liquidity could not be checked", ceiling: "5.0" },
  { flag: "Fewer than 60% of checks observed", ceiling: "6.0" },
];
