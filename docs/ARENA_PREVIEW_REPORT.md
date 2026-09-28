# Arena preview report — 23 September 2026

## Implemented in this increment

- M2 foundation: shared authoritative room, 30 Hz simulation, personalized 15 Hz snapshots, bounded input gate, client motion prediction/reconciliation and interpolation, four bots, reconnection hooks and deterministic NDJSON replay.
- M3 playable loop: fragments, mass, energy/boost, pulse knockback, interruptible 90-tick bank channel, dropped cargo, respawn, score and whale bounty with pair cooldown.
- M4 adapter: server-only collector, ten-ID USD batch, persistent reservations and single-owner lock, account usage probes, normalizer, cache, stale/degraded handling and local evidence. Mock-tested; not yet live-verified.
- M5 preview: surge telegraph/active/decay, final two-minute Market Close, HUD, onboarding, touch controls, optional sound and reduced-motion rendering.
- M6 initial verification: automated gameplay/transport/quota tests and full-match simulation load measurement. M6/M7 are not declared complete.

## Evidence

`pnpm check`: 31 passing tests, compilation and package boundaries passed. Two real Colyseus clients joined one arena and observed authoritative input, rejected score injection and disconnect. Client matchmaking options cannot override trusted room/service/filesystem configuration.

Full-match 16-bot load, 18,000 ticks: checksum c3129092; mean 0.1021 ms/tick, p95 0.1532 ms, maximum 2.3987 ms on this local machine. Includes bot decisions and simulation only, not network serialization/rendering. Observed 379 pickups, 14 banks, 692 interrupted bank channels, 2,311 pulses and 18 eliminations. High pulse/interruption frequency needs human balance testing.

Browser verified at http://127.0.0.1:5173/: arena rendered, connection established, live match countdown, ten nodes, bots, cargo and leaderboard visible. No online publication performed. Phaser production chunk remains ~1.2 MB uncompressed (~319 KB gzip).

## Remaining gates

1. User configures Basic key locally; verify actual account entitlements, key/info shape, quote response and credit accounting. Save redacted genuine evidence for submission. All existing provider tests use explicitly synthetic fixtures.
2. Complete latency/loss/reconnection and prediction-error acceptance tests; current transport tests cover connection, movement, authority and clean disconnect.
3. Public deployment hardening: origins, admission limits, abuse/rate controls, durable shared budget if scaling, replay retention and provider licensing review.
4. Human playtest: pacing, field strength, readable polarity, banking pressure, mobile usability and endgame fairness.
5. M7: public repository, deployed demo, video, track justification, API feedback, social post and DoraHacks submission. No accounts/submission/publication are implied by this preview.

Budget design: quotes 288/day plus at most 24 hourly probes = at most 312 scheduled credits/day if both endpoints charge one. Local caps 320/day and 10,000/month; provider remaining quota can reduce them. This does not grant other programs permission to consume the account reserve. Do not remove the ledger or swap keys to evade limits.
