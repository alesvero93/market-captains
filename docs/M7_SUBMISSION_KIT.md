# MARKET CAPTAINS — M7 submission kit (draft)

Status: revised 27 September 2026. Authenticated CMC Basic integration verified; public artifacts and human acceptance remain outstanding. See CMC_LIVE_REPORT.md and CRITICAL_REVIEW.md.

## Proposed public description

MARKET CAPTAINS turns market data into a shared arcade arena. Capitalization controls node strength, trading volume changes where fragments appear, and signed one-hour momentum directs the current. Players switch LONG and SHORT to navigate those fields, collect cargo and commit to a three-second deposit while opponents can interrupt them.

The node inspector makes the transformation visible. Game indices are labelled as such rather than presented as prices or predictions. All players share one market collector: ten assets in one USD batch every five minutes. The game remains playable with explicitly labelled synthetic or stale data when the live feed is unavailable.

Proposed track: Data and Visualisation. The visualisation claim must be demonstrated with a genuine response, its normalized values and the visible node behaviour. Track acceptance is the organizer's decision.

## Two-minute demo script

0:00–0:15 — Introduce the problem: make relationships between market size, momentum and volatility visible through play. State whether the demonstrated feed is LIVE or SYNTHETIC.

0:15–0:40 — Open the node inspector. Compare positive and negative signed momentum. Switch LONG and SHORT near a node and explain that gravity remains in both modes.

0:40–1:05 — Collect cargo, show the mass/boost tradeoff, then deposit at a gate for three seconds. Show a pulse interrupt and confirm that banked score survives respawn.

1:05–1:30 — Show the actual CMC request code and a genuine redacted response, then the normalized field and provider timestamp. Use docs/evidence/CMC_QUOTE_EVIDENCE.json and identify its timestamp; never substitute an unlabelled test fixture.

1:30–1:50 — Show two clients in one room and explain shared collection, five-minute scheduling, persistent quota reservations and Basic operating caps.

1:50–2:00 — Show the repository/test report and invite judges to the demo. State known limitations concisely.

## Manual playtest checklist

Use two browser profiles or devices against the intended deployment. Record pass/fail, browser/device and observed issue; do not mark these checks passed from automated tests alone.

1. Join together and identify both pilots; verify independent controls and a shared leaderboard.
2. Collect and deposit cargo; move away halfway to confirm restart of the channel.
3. Pulse a depositing player; verify interruption without duplicate scoring.
4. Lose cargo on elimination while preserving deposited score; wait for respawn.
5. Disconnect for five seconds, reconnect and check identity, score and released controls.
6. Add network delay, switch polarity and collide; assess visible corrections and input responsiveness.
7. Test touch steering plus boost/automatic deposit, portrait layout, keyboard focus, reduced motion and muted audio.
8. Complete a ten-minute match, inspect Market Close and join a fresh match.
9. Disable the feed in a test environment; verify timestamp-based stale/degraded labelling and no new live surges.

## Evidence slots to fill before submission

- Public repository URL: pending.
- Demo URL and availability through judging: pending; independent free hosting requested.
- Video URL: pending.
- Genuine API code and redacted response: verified locally; see docs/evidence.
- Endpoints: /v3/cryptocurrency/quotes/latest and /v1/key/info (adapter implemented; live access verified locally).
- API feedback: document only observed authenticated behaviour; mock tests are not provider feedback.
- Selected track: proposed Data and Visualisation; confirm when submitting.
- DoraHacks BUIDL URL and X post with #BuildwithCMC: pending. No post or submission has been sent.

Refer to COMPETITION_AND_BASIC_PLAN.md for the organizer requirements previously verified. Recheck the event page before the final submission. Current artifacts make no claim of organizer approval, uninterrupted hosting or production readiness.
