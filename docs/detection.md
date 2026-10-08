# Detection and alert rules

An event is only shown or pushed if the user's rules want it.

## Rules

- Every event kind has a default on or off and, for some, a threshold (for example liquidity drops of 15% or more).
- Settings are per device. A token can override them.
- Minimum severity decides what pushes (critical only, or critical and warnings).
- A muted token never pushes.
- The Observe feed and the token chart apply the same filter.

## Push

A push has what changed, one reason and a link back to the token. Wording is informational and never says buy, sell or ape. Several devices linked to one ID each get the alert.

## Missing data

An alert that needs data HODL does not have does not fire.

## Not built yet

Custom user-written rules (for example "Health below 4") and "ping me when this address is posted" are planned, not built.
