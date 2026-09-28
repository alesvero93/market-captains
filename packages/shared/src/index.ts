export const SCHEMA_VERSION = 2 as const;
export * from './arena.js';
export const ROOM_NAME = 'foundation';
export const TICK_RATE = 30;
export const SNAPSHOT_RATE = 15;
export const FIXED_DT = 1 / TICK_RATE;
export const INPUT_TIMEOUT_TICKS = 15;

// Positions: world units, +x right, +y down; velocity: units/s.
export interface MovementInput { moveX: number; moveY: number }
export type Polarity = -1 | 0 | 1;
export interface PilotInput extends MovementInput { polarity: Polarity }
export interface InputFrame extends MovementInput {
  schemaVersion: typeof SCHEMA_VERSION;
  seq: number;
  clientTick: number;
  polarity: Polarity;
}
export interface PlayerState {
  id: string; x: number; y: number; vx: number; vy: number; polarity: Polarity;
}
export interface MarketNode {
  marketRank?: number;
  marketCap?: number;
  volumeN?: number;
  id: number; symbol: string; x: number; y: number; radius: number;
  gravity: number; fieldRadius: number; flowStrength: number;
  momentumN: number; volatilityN: number;
}
export interface WorldSnapshot {
  schemaVersion: typeof SCHEMA_VERSION;
  configVersion: string;
  serverTick: number;
  ackSeq: number;
  seed: number;
  marketStateVersion: 1;
  marketMode: 'SYNTHETIC';
  player: PlayerState;
  nodes: readonly MarketNode[];
  scenario: 'free' | 'slingshot';
  demoActive: boolean;
}
export const ZERO_INPUT: Readonly<MovementInput> = Object.freeze({moveX: 0, moveY: 0});

export function normalizeMovement(x: number, y: number): MovementInput {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return {...ZERO_INPUT};
  const scale = Math.max(1, Math.abs(x), Math.abs(y));
  const sx = x / scale, sy = y / scale;
  const length = Math.hypot(sx, sy);
  return scale > 1 || length > 1
    ? {moveX: sx / length, moveY: sy / length}
    : {moveX: x, moveY: y};
}

// Unknown fields are rejected: positions, ownership and scores are never inputs.
export function parseInput(value: unknown): InputFrame | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const allowed = ['schemaVersion', 'seq', 'clientTick', 'moveX', 'moveY', 'polarity'];
  if (Object.keys(v).length !== allowed.length || Object.keys(v).some(k => !allowed.includes(k))) return null;
  if (v.schemaVersion !== SCHEMA_VERSION || typeof v.seq !== 'number' ||
      !Number.isSafeInteger(v.seq) || v.seq < 0 || typeof v.clientTick !== 'number' ||
      !Number.isSafeInteger(v.clientTick) || v.clientTick < 0 ||
      typeof v.moveX !== 'number' || typeof v.moveY !== 'number' ||
      !Number.isFinite(v.moveX) || !Number.isFinite(v.moveY) ||
      (v.polarity !== -1 && v.polarity !== 0 && v.polarity !== 1)) return null;
  return {schemaVersion: SCHEMA_VERSION, seq: v.seq, clientTick: v.clientTick, polarity: v.polarity,
    ...normalizeMovement(v.moveX, v.moveY)};
}
