# Decision log — M0

## M1 update

M1 was authorized after the user canceled temporary publication. No tunnel was launched. See `M1_REPORT.md` for implemented field physics, protocol v2, tuning and acceptance measurements. Earlier M0 statements below are retained as historical decisions; the current milestone is M1. The original source-only M0 ZIP remains a separate snapshot.

- **2026-09-23 / scope:** implement M0 only following the user's authorization. Treat the supplied handoff as design reference, not independent instructions to publish, contact others or spend money. Original files are retained under `docs/handoff`; the provenance file identifies them as a reconstruction, not the original lost archive.
- **Architecture:** `shared → sim → server`, and `shared → client`. Arrows indicate consumption by the right-hand package. No client import of sim; no browser/transport dependency in sim. No API service, wallet, database, boost, gravity, banking or competitive multiplayer in M0.
- **Authority overlap:** the handoff postpones networking to M2 but requires an authoritative moving player in M0. A one-client Colyseus room with plain versioned snapshots is the minimum connecting slice. Room capacity is one; additional clients get separate rooms. Prediction, reconciliation, reconnect-to-same-room and multiplayer remain M2.
- **State:** typed plain snapshots at 15 Hz, simulation at 30 Hz. Colyseus handles transport/rooms; no Schema decorators required for this minimal message protocol. Room ownership is derived from the session, never accepted from input.
- **Input:** movement only in schema v1. Reserve boost/polarity/pulse for later schema revisions; advertising inert actions now would misrepresent M0. Reject unknown fields, non-finite numbers, invalid sequence/version, reorder/duplicate and regressing client tick; normalize magnitude. Client ticks provide ordering, not authoritative elapsed time. Latest accepted movement is consumed once per server tick. Limit 60 input messages per simulated second; stale input becomes neutral after 15 ticks. Flood handling/distributed DoS defenses are not production-ready.
- **Clock:** a callback advances exactly one 1/30-second tick. Rendering never advances simulation. No large variable delta or catch-up teleport after process stalls; overloaded servers temporarily run slow. Production scheduling/load tests remain M2/M6.
- **Determinism:** explicit uint32 seed and LCG spawn, pure step, semi-implicit Euler. Promise is same runtime/config/seed/accepted tick-input stream, not cross-platform bitwise lockstep. FNV checksum is a regression/debug identifier, not a security hash. Network arrival times must be recorded as accepted per-tick input before a real session can be replayed; M0 includes a deterministic standalone trace, not a production replay recorder.
- **Configuration:** world units (+x right/+y down), speed units/second, acceleration units/second². Arena 1440×900, radius 14, thrust 640, linear drag 2.4/s, cap 280. Clamped walls remove outward velocity without adding bounce; all values are baselines.
- **Presentation:** one-frame-pair interpolation of authoritative snapshots, approximately one snapshot interval behind server; no client prediction. Keyboard WASD/arrows, focus loss releases controls, reconnect opens a fresh room. Touch controls are out of M0. System fonts avoid external asset requests.
- **Dependency choices:** Phaser 3.90.0 follows the required major; current Colyseus 0.18 core/sdk/transport versions pinned, Vite 8.3.0, TypeScript strict. pnpm lockfile committed in deliverable. Optional msgpack native acceleration disabled; portable JS fallback suffices. Review dependency notices/audit before public deployment.
- **CMC cost:** Basic-first at all times, 5-minute shared poll, planned 10k application cap below published 15k. Detailed safeguards are a M4 design, not a claim that live quotas have already been enforced. M0 performs zero provider calls.
- **Runtime compatibility:** Node 22.18+ executes type-only TypeScript test files natively; no tsx runtime is needed. Colyseus 0.18 HTTP routes use its router, avoiding competing HTTP response handlers. Express is declared because the transport imports its optional peer at runtime. Clean install and actual transport tests cover these choices.

## M1 risks / proposed acceptance

1. Radial flow must follow `polarity × momentumN` while NEUTRAL preserves gravity. Write the four sign tests before tuning.
2. Stable node topology conflicts with original wording about moving planets. Keep positions fixed; update bounded fields only.
3. Five-minute data cadence does not mean slow control response: fields interpolate slowly, controls respond each tick. Avoid inventing real-time volatility.
4. Frozen initial snapshot versus changing fields: pin topology/config/initial version, then record each accepted field update with its tick/version for later replay.
5. Slingshot and turbulence need seed-stable acceptance trajectories, collision softening and acceleration clamps. Do not equate profitability with player score.
6. Bounded physics and understandable force direction matter more than more endpoints. The competition track still needs a visible, intelligible link between data and behavior.
