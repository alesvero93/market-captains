import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/server/dist/server.js';
import type { WorldSnapshot } from '../packages/shared/dist/index.js';
import { SCHEMA_VERSION } from '../packages/shared/dist/index.js';

test('real Colyseus room: connection, authoritative movement, invalid input and disconnect', {timeout: 15000}, async () => {
  const {server, httpServer} = createGameServer();
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert.ok(address && typeof address !== 'string');
  const endpoint = `http://127.0.0.1:${address.port}`;
  let room: Room | undefined;
  try {
    const health = await fetch(`${endpoint}/health`).then(r => r.json()) as {cmcCalls: number};
    assert.equal(health.cmcCalls, 0);
    room = await new Client(endpoint).joinOrCreate('foundation');
    let latest: WorldSnapshot | undefined;
    room.onMessage('snapshot', (snapshot: WorldSnapshot) => { latest = snapshot; });
    const until = async (condition: () => boolean) => {
      const deadline = Date.now() + 3000;
      while (!condition()) {
        if (Date.now() > deadline) throw new Error('Snapshot expectation timed out');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    };
    await until(() => latest !== undefined);
    const startX = latest!.player.x;
    room.send('input', {schemaVersion: SCHEMA_VERSION, seq: 0, clientTick: 0, moveX: 1, moveY: 0, polarity: 1});
    await until(() => latest!.ackSeq === 0 && latest!.player.x > startX + 5);
    const tick = latest!.serverTick;
    assert.equal(latest!.player.polarity, 1);
    room.send('input', {schemaVersion: SCHEMA_VERSION, seq: 1, clientTick: 1, moveX: 0, moveY: 0, polarity: 0, x: 99999});
    await until(() => latest!.serverTick > tick + 3);
    assert.equal(latest!.ackSeq, 0);
    assert.ok(latest!.player.x < 1440);
    room.send('input', {schemaVersion: SCHEMA_VERSION, seq: 2, clientTick: 2, moveX: 0, moveY: 0, polarity: -1});
    await until(() => latest!.ackSeq === 2);
    assert.equal(latest!.marketMode, 'SYNTHETIC');
    assert.equal(latest!.player.polarity, -1);
    assert.equal(latest!.nodes.length, 3);
    room.send('scenario', 'slingshot');
    await until(() => latest!.scenario === 'slingshot');
    assert.equal(latest!.nodes.length, 1);
    assert.equal(latest!.demoActive, true);
    room.send('input', {schemaVersion: SCHEMA_VERSION, seq: 999, clientTick: 999, moveX: 1, moveY: 1, polarity: -1});
    await until(() => latest!.serverTick >= 36);
    assert.equal(latest!.player.polarity, 1);
    assert.equal(latest!.ackSeq, -1);
    await room.leave(); room = undefined;
  } finally {
    if (room) await room.leave();
    await server.gracefullyShutdown(false);
  }
});
