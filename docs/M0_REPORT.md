# M0 verification report

## Delivered

Monorepo with four strict TypeScript packages, Phaser desktop arena, single-player Colyseus room, pure seeded simulation, normalized input, immutable steps, authoritative snapshots and visual interpolation. Source handoff preserved and all **22 SHA-256 manifest entries match**.

## Verified in this workspace

- Clean source-only copy: `pnpm install --frozen-lockfile --offline` succeeded using the local package cache, followed by a complete successful `pnpm check`. No prior `node_modules` or built `dist` directories were copied. Initial dependency acquisition was from the npm registry.
- `pnpm check`: production build, test TypeScript checking, **8/8 tests passed**, dependency-boundary checks passed.
- Replay: seed `20260923`, **10,000 ticks**, checksum **`516b0386`**; golden checksum test protects against unintended physics changes.
- 30/60/144 FPS schedule test: all observe the same authoritative end state. This is an automated simulation/render-schedule test, not a benchmark on three physical monitors.
- Movement tests: normalized diagonal acceleration, bounded speed and arena, braking, state purity and finite-input checks.
- Input tests: reject malformed data, position/score/identity injection, duplicate/reordered sequences, regressing client tick and excess message rate; stale input neutralizes after 15 ticks.
- Integration test uses an actual local HTTP/WebSocket server and Colyseus SDK: room join, server-produced movement, rejected position injection, consumed-input acknowledgement and clean leave. `/health` confirms M0 and zero provider calls.
- Browser: page loaded, status **Pilota connesso**, arena and pilot visibly rendered, server position displayed, market explicitly offline and CMC counter zero. Keyboard-hold behavior at different physical display refresh rates is not separately certified.

## Known limits

- Local prototype only. One client per room, no public hosting, no complete multiplayer, no field physics, no API adapter and no final competition submission.
- The future Basic quota design is documented separately; no CMC key, live response or account-specific entitlement has been tested. M0 contains no provider request path.
- Renderer-only interpolation adds approximately 67 ms of visual buffering; local prediction comes in M2. A process stall slows simulated time; load/recovery testing comes later.
- Phaser production chunk is about 1.20 MB uncompressed / 319 KB gzip, producing Vite's chunk-size warning. This is a performance optimization item, not a failed build.
- `test:unit` and `replay` use existing built packages; `pnpm check` rebuilds first. The replay utility is a deterministic synthetic trace, not a saved browser match.

## M0 gate

M0 implementation is complete. Remaining work belongs to M1+ and submission preparation, detailed in `DECISIONS.md` and `COMPETITION_AND_BASIC_PLAN.md`. Recommended next technical checkpoint: a synthetic stationary node with gravity, all four polarity sign cases, NEUTRAL behavior, bounded turbulence and a reproducible slingshot route.
