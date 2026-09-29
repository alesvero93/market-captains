import type { MarketNode, PlayerState, Polarity } from './index.js';
import { normalizeMovement } from './index.js';
export const ARENA_SCHEMA_VERSION = 6 as const;
export const AVATARS = ['MOONBEAN','HODLOG','FROGGY','BLOB','SATCAT','WHALEY','PEPPER','ROCKET','JELLY','NUGGET'] as const;
export function playerIdentity(value:unknown):{name:string;avatar:number} {
  const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const avatar=Number.isInteger(v.avatar)&&Number(v.avatar)>=0&&Number(v.avatar)<AVATARS.length?Number(v.avatar):0;
  const name=typeof v.name==='string'?v.name.normalize('NFKC').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,16):'';
  return {name:name||AVATARS[avatar]!,avatar};
}
export const ARENA_ROOM_NAME = 'arena';
export interface ArenaInput {
  schemaVersion: typeof ARENA_SCHEMA_VERSION; seq: number; clientTick: number;
  moveX: number; moveY: number; polarity: Polarity; boost: boolean; pulse: boolean; bank: boolean;
}
export type ActionInput = Pick<ArenaInput, 'moveX' | 'moveY' | 'polarity' | 'boost' | 'pulse' | 'bank'>;
export const IDLE_ACTION: Readonly<ActionInput> = Object.freeze({moveX: 0, moveY: 0, polarity: 0, boost: false, pulse: false, bank: false});
export type MarketMode = 'SYNTHETIC' | 'LIVE' | 'STALE' | 'DEGRADED';
export interface MarketFrame {
  version: number; mode: MarketMode; sourceTime: number | null;
  nodes: readonly MarketNode[]; fragmentWeights: Record<string, number>; message: string;
}
export interface Contestant extends PlayerState {
  hacker?: boolean;
  name: string; avatar: number; bot: boolean; connected: boolean; energy: number; integrity: number;
  cargo: number; banked: number; bountyScore: number; eventScore: number;
  bankTicks: number; lastBankTick: number; pulseReadyTick: number;
  respawnTick: number; protectedUntil: number; bankBlockedUntil: number;
  lastAttacker: string; lastAttackTick: number; whale: boolean;
}
export interface Airdrop { name:string; x:number; y:number; start:number; end:number }
export interface Fragment { diamond?:boolean; id: number; x: number; y: number; vx: number; vy: number; value: number; event: boolean }
export interface Gate { id: number; x: number; y: number; radius: number }
export interface GameEvent { type: 'pulse' | 'bank' | 'elimination' | 'respawn'; tick: number; x: number; y: number; playerId: string; amount: number }
export interface Surge { nodeId: number; startTick: number; stage: 'telegraph' | 'active' | 'decay' }
export interface LobbySnapshot {
 roomId:string; hostId:string; remainingMs:number; capacity:number;
 players:{id:string;name:string;avatar:number;connected:boolean}[];
}
export interface ArenaSnapshot {
  schemaVersion: typeof ARENA_SCHEMA_VERSION; matchId: string; selfId: string; seed: number;
  tick: number; ackSeq: number; players: Contestant[]; nodes: readonly MarketNode[];
  fragments: Fragment[]; gates: readonly Gate[]; events: GameEvent[];
  globalPolarity?: Polarity; airdrop?: Airdrop | undefined;
  remainingTicks: number; phase: 'playing' | 'closing' | 'finished'; closeRadius: number; surge: Surge | null;
  marketVersion: number; marketMode: MarketMode; marketSourceTime: number | null; marketMessage: string;
}
export function parseArenaInput(value: unknown): ArenaInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const keys = ['schemaVersion','seq','clientTick','moveX','moveY','polarity','boost','pulse','bank'];
  if (Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) return null;
  if (v.schemaVersion !== ARENA_SCHEMA_VERSION || typeof v.seq !== 'number' || !Number.isSafeInteger(v.seq) || v.seq < 0 ||
    typeof v.clientTick !== 'number' || !Number.isSafeInteger(v.clientTick) || v.clientTick < 0 ||
    typeof v.moveX !== 'number' || typeof v.moveY !== 'number' || !Number.isFinite(v.moveX) || !Number.isFinite(v.moveY) ||
    (v.polarity !== -1 && v.polarity !== 0 && v.polarity !== 1) ||
    typeof v.boost !== 'boolean' || typeof v.pulse !== 'boolean' || typeof v.bank !== 'boolean') return null;
  return {schemaVersion: ARENA_SCHEMA_VERSION, seq: v.seq, clientTick: v.clientTick, polarity: v.polarity,
    boost: v.boost, pulse: v.pulse, bank: v.bank, ...normalizeMovement(v.moveX, v.moveY)};
}
