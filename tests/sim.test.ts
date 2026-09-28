import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, checksum, createWorld, randomStep, replay, step } from '../packages/sim/dist/index.js';
import { normalizeMovement, parseInput, SCHEMA_VERSION } from '../packages/shared/dist/index.js';
import { InputGate } from '../apps/server/dist/input-gate.js';

const frame = (seq = 0) => ({schemaVersion: SCHEMA_VERSION, seq, clientTick: seq, moveX: 1, moveY: 0, polarity: 0});
const inputs = Array.from({length: 10000}, (_, tick) => ({moveX: tick % 120 < 60 ? 1 : -1, moveY: tick % 200 < 100 ? 0.5 : -0.5}));

test('10,000 ticks replay identically after JSON serialization', () => {
  const a = replay(20260923, inputs);
  const b = replay(20260923, JSON.parse(JSON.stringify(inputs)) as typeof inputs);
  assert.equal(a.tick, 10000);
  assert.deepEqual(a, b);
  assert.equal(checksum(a), checksum(b));
  assert.equal(checksum(a), '6f916d7f');
  assert.notEqual(checksum(a), checksum(replay(17, inputs)));
});
test('seeded generator has a fixed known output and rejects invalid seeds', () => {
  assert.equal(randomStep(0).state, 1013904223);
  assert.deepEqual(createWorld(77), createWorld(77));
  for (const seed of [-1, 0x100000000, NaN, 0.5]) assert.throws(() => createWorld(seed));
});
test('render schedules of 30/60/144 FPS observe the same 10,000-tick authoritative timeline', () => {
  const hashes = [30, 60, 144].map(fps => {
    let state = createWorld(20260923);
    const frames = Math.ceil(10000 * fps / 30);
    for (let frameNo = 1; frameNo <= frames; frameNo++) {
      const targetTick = Math.min(10000, Math.floor(frameNo * 30 / fps));
      while (state.tick < targetTick) state = step(state, inputs[state.tick]!);
      // Rendering can observe/copy state but supplies no delta to simulation.
      const renderCopy = {...state.player};
      renderCopy.x += 0.01;
    }
    assert.equal(state.tick, 10000);
    return checksum(state);
  });
  assert.equal(new Set(hashes).size, 1);
});
test('step is pure, speed capped, arena bounded and release brakes the pilot', () => {
  const start = createWorld(42);
  const original = structuredClone(start);
  step(start, {moveX: 1, moveY: 1});
  assert.deepEqual(start, original);
  let state = start;
  for (let i = 0; i < 10000; i++) {
    state = step(state, {moveX: i % 400 < 200 ? 1 : -1, moveY: 1});
    assert.ok(Math.hypot(state.player.vx, state.player.vy) <= CONFIG.maxSpeed + 1e-8);
    assert.ok(state.player.x >= CONFIG.radius && state.player.x <= CONFIG.width - CONFIG.radius);
    assert.ok(state.player.y >= CONFIG.radius && state.player.y <= CONFIG.height - CONFIG.radius);
  }
  state = step(createWorld(9, 'pilot', []), {moveX: 1, moveY: 0});
  const speed = state.player.vx;
  for (let i = 0; i < 600; i++) state = step(state, {moveX: 0, moveY: 0});
  assert.ok(state.player.vx < speed / 50);
});
test('diagonal input does not grant extra acceleration', () => {
  const start = createWorld(9, 'pilot', []);
  const straight = step(start, {moveX: 1, moveY: 0}).player;
  const diagonal = step(start, {moveX: 1, moveY: 1}).player;
  assert.ok(Math.abs(Math.hypot(diagonal.vx, diagonal.vy) - straight.vx) < 1e-10);
  assert.ok(Math.hypot(...Object.values(normalizeMovement(Number.MAX_VALUE, Number.MAX_VALUE))) <= 1);
});
test('input validation rejects malformed frames and authority injection', () => {
  for (const bad of [null, [], {}, {...frame(), schemaVersion: 1}, {...frame(), seq: -1},
    {...frame(), seq: 0.5}, {...frame(), clientTick: Infinity}, {...frame(), moveX: NaN},
    {...frame(), moveY: '1'}, {...frame(), x: 99999}, {...frame(), score: 500}, {...frame(), playerId: 'other'}]) {
    assert.equal(parseInput(bad), null);
  }
  const valid = parseInput({...frame(), moveX: 100, moveY: 100});
  assert.ok(valid);
  assert.ok(Math.abs(Math.hypot(valid.moveX, valid.moveY) - 1) < 1e-10);
});
test('input gate rejects replay/reorder, bounds rate, acknowledges consumed input and stops stale movement', () => {
  const gate = new InputGate();
  assert.equal(gate.receive(frame(2), 0), true);
  assert.equal(gate.ackSeq, -1);
  assert.equal(gate.receive(frame(2), 0), false);
  assert.equal(gate.receive(frame(1), 0), false);
  assert.equal(gate.consume(0).moveX, 1);
  assert.equal(gate.ackSeq, 2);
  assert.deepEqual(gate.consume(15), {moveX: 0, moveY: 0, polarity: 0});
  for (let i = 3; i <= 60; i++) gate.receive(frame(i), 1);
  assert.equal(gate.receive(frame(61), 1), false);
  assert.equal(gate.receive(frame(62), 30), true);
  assert.equal(gate.receive({...frame(63), clientTick: 1}, 30), false);
});
