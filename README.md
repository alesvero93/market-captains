# Current release: singleplayer and multiplayer

Choose the mode alongside your name and avatar. Singleplayer runs locally with 3, 4 or 5 bots and three difficulty levels. Multiplayer joins an existing public waiting lobby or creates one; an optional room link invites friends to the same lobby. A shared server deadline starts with the first arrival and never extends beyond three minutes. Ten humans start immediately; the host may start early. At launch, bots fill empty seats to 10 total, and the room locks to new arrivals. New matchmaking opens another waiting lobby. Reconnection retains a seat for 15 seconds; abandoned seats become bots.

Online simulation, scores and health are server-authoritative at 30 Hz. Snapshots are sent at 10 Hz; the client predicts its own motion with bounded reconciliation and interpolates other players. Online matches continue when a tab loses focus or the guide opens; controls are released. Solo uses an absolute five-minute clock and recovers elapsed simulation ticks after browser throttling. Neither the guide nor loss of focus pauses a match. Closing/reloading the page leaves the local match. Render shares one cached CMC feed across all rooms; joining players does not generate provider calls. The service is limited to eight concurrent rooms. Wallets and the final storm destination are seeded per match; wallet shields prevent body-blocking and hostile pulses. Final wallet points are revealed on an animated rank chart (ties use the existing bonus/earliest-deposit rules).

# MARKET CAPTAINS — playable arena preview

Five-minute arena: five to seven market planets (BTC central, ETH in a slow orbit), polarity currents, fragments, cargo mass, boost, pulse, 3-second bank channels, elimination/respawn, leaderboard, volatility surge and Market Close. Solo has 3–5 bots with selectable difficulty; multiplayer has up to 10 total participants. The original field lab is development-only.

## Run locally

Node.js 22.18+ and pnpm 11.19.0 (tested with Node 24.19):

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5173/. Hold left mouse to steer toward the cursor; right mouse or Shift boosts. WASD/arrows remain available. Space pulses. Stop inside a green wallet for 3 seconds to deposit. Health (85) and regenerating fuel are separate. Matches last five minutes. SHARE GAME shares the site; the waiting lobby provides the room-specific invitation.

The biggest active banked wallet becomes the whale and alone controls the shared LONG/SHORT current (Q, 2-second reversal cooldown). It drops a blue 10-point diamond every 3 seconds, collectible by everyone except the current whale. Bitcoin has tangential clockwise/counterclockwise flow, damaging solar heat and a lethal core. Other planets retain their existing attraction/current mechanics. One of five fictional memecoins appears once for 30 seconds, dropping 30 fragments worth 15 each. The last-minute storm shrinks toward the central wallet, ramps up outside damage and increases newly spawned fragment value. Choose Relaxed, Challenging or Ruthless bots before a match; no extra CMC calls or extra bot slots are used.

The backend runs at 127.0.0.1:2567. Stop with Ctrl+C. Server/shared/sim edits require rebuilding and restarting; client edits reload automatically. Windows may require `pnpm.cmd`.

## CMC Basic setup

Copy `apps/server/.env.example` to `apps/server/.env.local` and put your own key after `CMC_API_KEY=`. Restart `pnpm dev`. Never place a key in a VITE variable, chat, screenshot or repository. Without a key, no external request is made and the UI explicitly says SYNTHETIC.

One server-wide collector requests ten assets in one USD batch every 300 seconds. `/v1/key/info` checks account usage hourly. Both calls reserve credit before sending; the local ceiling is 10,000 credits/month and 320/day, and the account's remaining quota can lower these ceilings. Continuous worst-case scheduled use, charging one credit even for each hourly usage probe: 9,672/month (31 days), 312/day. Unknown request outcomes retain their reservation. Unexpected cost or authorization errors suspend polling. All rooms share the same feed.

Keep `.data` on durable storage across restarts. Never delete its quota ledger to reset limits. Only one collector may own this directory; this is a single-instance design, not distributed coordination. Other programs using the same CMC account consume its shared allowance; use a dedicated application setup and keep a reserve. Authenticated Basic verification succeeded on 27 September 2026 for the two used endpoints; see docs/CMC_LIVE_REPORT.md and docs/evidence/.

Freshness uses the provider timestamp: LIVE up to 12 minutes, STALE up to 30, then DEGRADED. Stale data attenuates flow/turbulence and suppresses new surges. Existing matches pin the roster and sizes, move ETH on a deterministic orbit and smooth force changes. Source data, cache and latest API evidence stay in ignored `.data`; check provider retention rights before any public release. Replay recording is opt-in with RECORD_REPLAYS=1 and then needs manual retention management.

## Verification

```sh
pnpm check
node scripts/load-arena.ts
pnpm replay
pnpm slingshot
```

55 tests cover physics, authoritative deposits/economy, replay, input rejection, two-client transport, API mock responses and persistent quotas. Load script runs a complete 18,000-tick simulation with 10 bots; it does not measure browser rendering or internet latency.

See `docs/M6_REPORT.md`, `docs/M7_SUBMISSION_KIT.md` and `docs/ARENA_PREVIEW_REPORT.md` for measured results and remaining acceptance work. This is a local development preview, not a submitted or production-hardened hackathon entry. Public deployment, adversarial network/reconnect tests, external playtesting, video and submission are still pending. Public hosting needs HTTPS/WSS and an explicit origin/admission policy. Local default is loopback; HOST=0.0.0.0 enables managed hosting.


## Submission preparation
Run `node scripts/submission-check.mjs` to generate `release/SUBMISSION_STATUS.md` and a SHA-256 source manifest. Fill `submission.json` only with genuine artifacts. The check never publishes or calls CMC; final external review remains required. See `docs/M7_REPORT.md`.




## Compiled delivery mode
After `pnpm build`, stop the development process and run `pnpm start`. The compiled client and multiplayer share http://127.0.0.1:5173 without Vite. The existing CMC ledger and cache remain in use. See `docs/PRODUCTION_PREVIEW_REPORT.md` for configuration, observed browser checks and remaining public-hosting gates.


## Updated playtest candidate

Ten original avatar choices, sanitized names, wallet growth, five to seven planets with licensed icon assets, automatic deposits and same-room invitation links. See `docs/CRITICAL_REVIEW.md`, `docs/THIRD_PARTY_ASSETS.md` and `docs/HOSTING_AND_GITHUB.md`. Render Free configuration is provided in render.yaml; deployment and human Internet testing are not yet completed.

## Market Captains candidate update — 27 September 2026

Player-facing arena, onboarding, field lab and feed messages are in English. The four-card guide opens before joining; screen buttons and Left/Right work, Escape dismisses it, and GUIDE reopens it. A live multiplayer match keeps running while the guide is open.

Bots avoid solid cores, seek safer fragments, deposit at different wallet approaches, preserve energy and pulse only for a useful target or to escape the hacker. Settled neighbours no longer continually cancel one another's deposits. LONG/SHORT has animated directional chevrons; almost-zero momentum is honestly shown as weak rather than exaggerated.

The red HACKER temporarily occupies one existing bot slot. Its seeded, non-overlapping visits last 60 seconds each, before Market Close. It moves at 58 arena units/second, drains at most 2 cargo points/second per victim on contact, cannot collect or deposit, and is excluded from wallet shields. Pulse pushes it away. Wallet balances cannot be stolen. It never displaces a human: an arena with ten humans has no hacker. Very short internal test matches omit the encounters. No API calls are added by these features.

Social artwork: `docs/media/MARKET_CAPTAINS_X.png` (generated promotional illustration, not a gameplay screenshot). Publishing, human Internet testing, video and cross-linked X/DoraHacks submission remain pending. Internal `@liquidity/*` package identifiers and historical archive filenames are retained intentionally.
