# Limitations

- HODL shows observed data, not advice. Health is a measurement of current market structure, not a prediction.
- Health weights and score caps are provisional and still being calibrated. The version is shown with every score.
- The spec describes four factor groups. The code uses seven domains (Market, Liquidity, Flow, Holders, Creator, Security, Lifecycle) with 28 checks.
- Monitoring is scheduled polling, not live streaming. Alerts arrive after the next scan, not instantly. Whale activity comes from a webhook.
- Data comes from third parties and can be late, thin or wrong. HODL says so when it is degraded.
- "Posted CA" only looks at the token's own linked X account, over the last 7 days. "Not seen" does not prove it never posted.
- X alerts only cover the tracked accounts, and symbol-only matches are unconfirmed because symbols are not unique.
- No accounts. A watchlist lives on the device (or a linked group of devices). Clearing browser storage loses it unless another device is linked.
- Push needs a supported browser, and on iPhone the app on the Home Screen.
