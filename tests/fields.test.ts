import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, SYNTHETIC_NODES, accelerationAt, boundedNoise, checksum, createWorld, fieldAt,
  step, createSlingshotWorld, slingshotInput, SLINGSHOT_DURATION_TICKS } from '../packages/sim/dist/index.js';
import { parseInput, SCHEMA_VERSION } from '../packages/shared/dist/index.js';
import type { Polarity } from '../packages/shared/dist/index.js';
const node = {...SYNTHETIC_NODES[0]!, volatilityN: 0};
const probe = {x: node.x + 160, y: node.y};

for (const [momentum, polarity, outward] of [[0.8, 1, true], [0.8, -1, false], [-0.8, -1, true], [-0.8, 1, false]] as const) {
  test(`flow direction: momentum ${momentum}, polarity ${polarity}, outward=${outward}`, () => {
    const f = fieldAt({...node, momentumN: momentum}, probe, polarity, 42, 0);
    assert.equal(f.flow.x > 0, outward);
    assert.ok(Math.abs(f.flow.y) < 1e-12);
    assert.ok(f.gravity.x < 0);
  });
}
test('NEUTRAL and zero momentum cancel directional flow, not gravity', () => {
  const neutral = fieldAt(node, probe, 0, 42, 0);
  const noMomentum = fieldAt({...node, momentumN: 0}, probe, 1, 42, 0);
  assert.equal(Math.hypot(neutral.flow.x, neutral.flow.y), 0);
  assert.equal(Math.hypot(noMomentum.flow.x, noMomentum.flow.y), 0);
  assert.ok(neutral.gravity.x < -100);
  assert.deepEqual(neutral.total, neutral.gravity);
});
test('softened center is finite; current vanishes outside field boundary', () => {
  for (const point of [{x: node.x, y: node.y}, {x: node.x + 0.00001, y: node.y}]) {
    const f = fieldAt(node, point, 1, 42, 0);
    assert.ok(Number.isFinite(f.total.x) && Number.isFinite(f.total.y));
  }
  const f = fieldAt(node, {x: node.x + node.fieldRadius, y: node.y}, 1, 42, 0);
  assert.equal(Math.hypot(f.flow.x, f.flow.y), 0);
});
test('turbulence is seed-stable, bounded, smooth at knots and independent of polarity', () => {
  for (let tick = 0; tick < 10000; tick++) {
    const v = boundedNoise(77, node.id, tick);
    assert.ok(Math.hypot(v.x, v.y) <= 1);
    assert.deepEqual(v, boundedNoise(77, node.id, tick));
    const next = boundedNoise(77, node.id, tick + 1);
    assert.ok(Math.hypot(next.x - v.x, next.y - v.y) < 0.16);
  }
  assert.notDeepEqual(boundedNoise(77, 1, 20), boundedNoise(78, 1, 20));
  const a = fieldAt({...node, volatilityN: 0.8}, probe, 1, 77, 100).turbulence;
  const b = fieldAt({...node, volatilityN: 0.8}, probe, -1, 77, 100).turbulence;
  assert.deepEqual(a, b);
});
test('validated fixture outliers cannot exceed acceleration/speed limits', () => {
  const extreme = {...node, gravity: 1e300, flowStrength: 1e300, volatilityN: 1e300, momentumN: -1e300};
  let state = createWorld(42, 'pilot', [extreme]);
  state = {...state, player: {...state.player, x: node.x + 76, y: node.y}};
  for (let i = 0; i < 600; i++) {
    const input = {moveX: 1, moveY: 1, polarity: -1 as const};
    const a = accelerationAt(state, input);
    assert.ok(Math.hypot(a.x, a.y) <= CONFIG.maxAcceleration + 1e-8);
    state = step(state, input);
    assert.ok(Math.hypot(state.player.vx, state.player.vy) <= CONFIG.maxSpeed + 1e-8);
  }
  for (const invalid of [{...node, gravity: Infinity}, {...node, x: NaN}, {...node, radius: -1}, {...node, symbol: '<script>'}]) {
    assert.throws(() => createWorld(42, 'pilot', [invalid]));
  }
  assert.throws(() => createWorld(42, 'pilot', [node, {...node, id: 3}]));
});
test('nodes stay fixed, solid cores prevent penetration and contacts never add energy', () => {
  let state = createWorld(42, 'pilot', [{...node, gravity: 0, flowStrength: 0}]);
  state = {...state, player: {...state.player, x: node.x - node.radius - CONFIG.radius - 1, y: node.y, vx: 520, vy: 0}};
  const after = step(state, {moveX: 0, moveY: 0});
  assert.ok(Math.hypot(after.player.x - node.x, after.player.y - node.y) >= node.radius + CONFIG.radius - 1e-8);
  assert.equal(after.player.vx, 0);
  const original = structuredClone(state.nodes);
  for (let i = 0; i < 2000; i++) state = step(state, {moveX: 1, moveY: 0, polarity: 1});
  assert.deepEqual(state.nodes, original);
});
test('10,000-tick replay includes polarity, fields and turbulence', () => {
  const run = () => {
    let state = createWorld(77);
    for (let i = 0; i < 10000; i++) state = step(state, {
      moveX: i % 120 < 60 ? 1 : -1, moveY: i % 200 < 100 ? 0.5 : -0.5,
      polarity: (Math.floor(i / 90) % 3 - 1) as Polarity,
    });
    return state;
  };
  assert.deepEqual(run(), run());
  assert.notEqual(checksum(run()), checksum(createWorld(77)));
});
test('polarity values and old wire versions are rejected', () => {
  const good = {schemaVersion: SCHEMA_VERSION, seq: 1, clientTick: 1, moveX: 0, moveY: 0, polarity: 1};
  assert.ok(parseInput(good));
  for (const p of [2, -2, NaN, 'LONG', null, undefined, 0.5]) assert.equal(parseInput({...good, polarity: p}), null);
  assert.equal(parseInput({...good, schemaVersion: 1}), null);
});
test('no-thrust slingshot exits faster, clear of the core, with reproducible outbound trajectory', () => {
  const run = () => {
    let state = createSlingshotWorld(42), neutral = createSlingshotWorld(42);
    const n = state.nodes[0]!;
    let minDistance = Infinity;
    let exit: {tick: number; speed: number; radialSpeed: number} | undefined;
    for (let tick = 0; tick < SLINGSHOT_DURATION_TICKS; tick++) {
      const input = slingshotInput(tick);
      assert.equal(Math.hypot(input.moveX, input.moveY), 0);
      state = step(state, input);
      neutral = step(neutral, {moveX: 0, moveY: 0, polarity: 0});
      const dx = state.player.x - n.x, dy = state.player.y - n.y, d = Math.hypot(dx, dy);
      minDistance = Math.min(minDistance, d);
      if (!exit && d >= n.fieldRadius) exit = {tick: state.tick, speed: Math.hypot(state.player.vx, state.player.vy),
        radialSpeed: (dx * state.player.vx + dy * state.player.vy) / d};
    }
    assert.ok(exit);
    assert.equal(exit.tick, 99);
    assert.ok(exit.speed > 130); // Starts at 100 u/s; no thrust or scripted impulses.
    assert.ok(exit.radialSpeed > 120);
    assert.ok(minDistance > n.radius + CONFIG.radius + 20);
    assert.ok(Math.hypot(neutral.player.x - n.x, neutral.player.y - n.y) < n.fieldRadius);
    assert.ok(state.player.x > n.x && state.player.y > n.y); // Explicit exit quadrant.
    return {state, exit, minDistance};
  };
  assert.deepEqual(run(), run());
});
