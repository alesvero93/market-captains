# M6 hardening increment — 24 September 2026

## Verified changes

35 tests pass with compilation and package-boundary checks. The real Colyseus transport test now closes a socket using the SDK reconnectable-close signal (4010), observes onDrop/onReconnect, retains session identity and accepts fresh input after the server resets the input gate. This is a controlled reconnect test, not a physical router outage.

The client now permits reconnect during the first five seconds of a session and disables SDK offline input buffering. Speculative motion is isolated in a bounded predictor (90 pending inputs maximum). Old snapshots and duplicate sequence numbers cannot rewind the pilot; death, match completion and reconnection reset or suspend speculation.

Deterministic motion tests run 300 input ticks with 100 ms and 300 ms delayed authoritative snapshots and periodically omitted updates. Under the test's unchanged motion model, reconciled position matches the authoritative reference within 1e-8 world units. These tests do not prove correction quality during combat, mismatched market updates or actual internet congestion; those require interactive testing.

CMC tests verify that 401 stops later requests and that shutdown during the usage probe does not launch a subsequent quotes request. In-flight credit reservation survives shutdown and restart. No live CMC call was made: local key configuration is still empty.

The arena now has an accessible node selector explaining capitalization, volume, signed momentum and sampled volatility. Its numbers are identified as game indices and synthetic scenarios are explicitly labelled.

## Acceptance still open

- Human playtest on keyboard and touch; actual network loss, 300 ms RTT and combat corrections.
- Basic account validation and actual code/response evidence after local key configuration.
- Hosting origin/admission controls, replay retention and durable storage configuration before public deployment.
- M7 external artifacts. The submission kit is a draft, not a completed submission.

Browser check: the new explanation opens, the ten-node selector is populated, and BTC indices and SYNTHETIC labelling are visible during Market Close.
