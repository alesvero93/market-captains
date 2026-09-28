import { Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import { SCHEMA_VERSION, TICK_RATE } from '@liquidity/shared';
import type { WorldSnapshot } from '@liquidity/shared';
import { CONFIG, createWorld, step, createSlingshotWorld, slingshotInput, SLINGSHOT_DURATION_TICKS } from '@liquidity/sim';
import { InputGate } from './input-gate.js';

export class FoundationRoom extends Room {
  override maxClients = 1;
  private world = createWorld(20260923);
  private gate = new InputGate();
  private scenario: 'free' | 'slingshot' = 'free';
  private roomTicks = 0;
  private nextResetTick = 0;

  override onCreate(): void {
    this.onMessage('input', (_client: Client, input: unknown) => {
      if (!this.demoActive()) this.gate.receive(input, this.world.tick);
    });
    this.onMessage('scenario', (client: Client, value: unknown) => {
      if ((value !== 'free' && value !== 'slingshot') || this.roomTicks < this.nextResetTick) return;
      this.nextResetTick = this.roomTicks + 60;
      this.scenario = value;
      this.world = value === 'slingshot' ? createSlingshotWorld(20260923, client.sessionId) : createWorld(20260923, client.sessionId);
      this.gate = new InputGate();
      client.send('snapshot', this.snapshot());
    });
    this.setSimulationInterval(() => {
      this.roomTicks++;
      this.world = step(this.world, this.demoActive() ? slingshotInput(this.world.tick) : this.gate.consume(this.world.tick));
      if (this.world.tick % 2 === 0) this.broadcast('snapshot', this.snapshot());
    }, 1000 / TICK_RATE);
  }

  override onJoin(client: Client): void {
    this.world = createWorld(20260923, client.sessionId);
    this.gate = new InputGate();
    client.send('snapshot', this.snapshot());
  }

  private snapshot(): WorldSnapshot {
    return {schemaVersion: SCHEMA_VERSION, configVersion: CONFIG.version,
      serverTick: this.world.tick, ackSeq: this.gate.ackSeq, seed: this.world.seed,
      marketStateVersion: 1, marketMode: 'SYNTHETIC', player: {...this.world.player}, nodes: this.world.nodes,
      scenario: this.scenario, demoActive: this.demoActive()};
  }
  private demoActive(): boolean { return this.scenario === 'slingshot' && this.world.tick < SLINGSHOT_DURATION_TICKS; }
}
