import { FIXED_DT, normalizeMovement } from '@liquidity/shared';
import type { MarketNode, MovementInput, PlayerState, Polarity } from '@liquidity/shared';
import { CONFIG } from './config.js';
import { SYNTHETIC_NODES, capVector, clamp, fieldAt, resolveContact, validateNodes } from './fields.js';
import type { Vector } from './fields.js';
export { CONFIG } from './config.js';
export { SYNTHETIC_NODES, boundedNoise, fieldAt, validateNodes } from './fields.js';
export * from './match.js';
export * from './prediction.js';
export * from './solo.js';
export interface SimInput extends MovementInput { polarity?: Polarity; thrustScale?: number; arcade?: boolean }
export interface SimState { tick: number; seed: number; rngState: number; player: PlayerState; nodes: readonly MarketNode[] }

// Explicit unsigned 32-bit PRNG; no clock or ambient random state.
export function randomStep(state: number): {state: number; value: number} {
  const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return {state: next, value: next / 4294967296};
}
export function createWorld(seed: number, playerId = 'pilot', nodes: readonly MarketNode[] = SYNTHETIC_NODES): SimState {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be uint32');
  const rx = randomStep(seed), ry = randomStep(rx.state);
  const validated = validateNodes(nodes);
  const player: PlayerState = {id: playerId, x: 400 + (rx.value - 0.5) * 80,
    y: 220 + (ry.value - 0.5) * 80, vx: 0, vy: 0, polarity: 0};
  resolveContact(player, validated);
  return {tick: 0, seed, rngState: ry.state, nodes: validated, player};
}

export function accelerationAt(state: SimState, input: SimInput): Vector {
  const move = normalizeMovement(input.moveX, input.moveY);
  const polarity = input.polarity ?? state.player.polarity;
  const thrust = CONFIG.acceleration * (input.thrustScale ?? 1);
  const steering=Math.hypot(move.moveX,move.moveY)>.05;
  const drag = input.arcade ? (steering?1.8:4) : CONFIG.drag;
  let x = move.moveX * thrust - drag * state.player.vx;
  let y = move.moveY * thrust - drag * state.player.vy;
  let field = {x:0,y:0};
  for (const node of state.nodes) {
    let force = fieldAt(node, state.player, polarity, state.seed, state.tick).total;
    if(input.arcade&&node.id===1){
      const dx=state.player.x-node.x,dy=state.player.y-node.y,d=Math.max(1,Math.hypot(dx,dy));
      const strength=260*(.65+.35*Math.abs(node.momentumN))*Math.max(0,1-d/node.fieldRadius);
      force={x:-dy/d*strength*(polarity||1),y:dx/d*strength*(polarity||1)};
    }
    if(input.arcade){
      const distance=Math.hypot(state.player.x-node.x,state.player.y-node.y);
      const envelope=Math.min(1,Math.max(0,(node.fieldRadius-distance)/40));
      field.x += force.x*envelope; field.y += force.y*envelope;
    }
    else{x += force.x; y += force.y;}
  }
  // Gameplay controls must overcome even overlapping inward market currents.
  // Cap the combined field, rather than each planet independently.
  if(input.arcade)field=capVector(field,thrust*(steering?.4:0));
  x += field.x; y += field.y;
  return capVector({x, y}, CONFIG.maxAcceleration);
}

// Pure semi-implicit Euler. A call is exactly one tick, independent of render FPS.
export function step(state: SimState, input: SimInput): SimState {
  const polarity = input.polarity ?? state.player.polarity;
  if (polarity !== -1 && polarity !== 0 && polarity !== 1) throw new Error('Invalid polarity');
  const acceleration = accelerationAt(state, input);
  const v = capVector({x: state.player.vx + acceleration.x * FIXED_DT, y: state.player.vy + acceleration.y * FIXED_DT}, CONFIG.maxSpeed);
  if(input.arcade&&Math.hypot(input.moveX,input.moveY)<.05&&Math.hypot(v.x,v.y)<3){v.x=0;v.y=0;}
  const p: PlayerState = {...state.player, polarity, vx: v.x, vy: v.y,
    x: state.player.x + v.x * FIXED_DT, y: state.player.y + v.y * FIXED_DT};
  resolveContact(p, state.nodes);
  p.x = clamp(p.x, CONFIG.radius, CONFIG.width - CONFIG.radius);
  p.y = clamp(p.y, CONFIG.radius, CONFIG.height - CONFIG.radius);
  if ((p.x === CONFIG.radius && p.vx < 0) || (p.x === CONFIG.width - CONFIG.radius && p.vx > 0)) p.vx = 0;
  if ((p.y === CONFIG.radius && p.vy < 0) || (p.y === CONFIG.height - CONFIG.radius && p.vy > 0)) p.vy = 0;
  return {...state, tick: state.tick + 1, player: p};
}

export function checksum(state: SimState): string {
  const p = state.player;
  const canonical = JSON.stringify([CONFIG.version, state.tick, state.seed, state.rngState,
    p.id, p.x, p.y, p.vx, p.vy, p.polarity, state.nodes.map(n => [n.id, n.symbol, n.x, n.y,
      n.radius, n.gravity, n.fieldRadius, n.flowStrength, n.momentumN, n.volatilityN])]);
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) hash = Math.imul(hash ^ canonical.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function replay(seed: number, inputs: readonly SimInput[]): SimState {
  return inputs.reduce(step, createWorld(seed));
}

// Isolated acceptance fixture, also playable as a server-driven demonstration.
export const SLINGSHOT_SWITCH_TICK = 30;
export const SLINGSHOT_DURATION_TICKS = 120;
export function createSlingshotWorld(seed: number, playerId = 'pilot'): SimState {
  const node = {...SYNTHETIC_NODES[0]!, volatilityN: 0};
  const state = createWorld(seed, playerId, [node]);
  return {...state, player: {...state.player, x: node.x, y: node.y - 160, vx: 100, vy: 0}};
}
export function slingshotInput(tick: number): SimInput {
  return {moveX: 0, moveY: 0, polarity: tick < SLINGSHOT_SWITCH_TICK ? 0 : 1};
}
export { opportunity } from './opportunities.js';

export {mouseSteering} from './mouse-steering.js';
