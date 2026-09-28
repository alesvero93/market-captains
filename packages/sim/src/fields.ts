import type { MarketNode, PlayerState, Polarity } from '@liquidity/shared';
import { CONFIG } from './config.js';
export interface Vector { x: number; y: number }
export const SYNTHETIC_NODES: readonly MarketNode[] = Object.freeze([
  Object.freeze({id: 1, symbol: 'BTC', x: 720, y: 430, radius: 60, gravity: 4000000,
    fieldRadius: 360, flowStrength: 1000, momentumN: 0.85, volatilityN: 0.18}),
  Object.freeze({id: 1027, symbol: 'ETH', x: 270, y: 650, radius: 44, gravity: 1900000,
    fieldRadius: 250, flowStrength: 440, momentumN: 0.4, volatilityN: 0.12}),
  Object.freeze({id: 5426, symbol: 'SOL', x: 1180, y: 310, radius: 36, gravity: 1300000,
    fieldRadius: 230, flowStrength: 470, momentumN: -0.75, volatilityN: 0.32}),
]);

export function boundedNoise(seed: number, nodeId: number, tick: number): Vector {
  const knot = Math.floor(tick / CONFIG.noisePeriodTicks);
  const t = (tick % CONFIG.noisePeriodTicks) / CONFIG.noisePeriodTicks;
  const blend = t * t * (3 - 2 * t);
  const at = (k: number, axis: number) => {
    let hash = (seed ^ Math.imul(nodeId, 374761393) ^ Math.imul(k, 668265263) ^ axis) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296 * 2 - 1;
  };
  const x0 = at(knot, 0), y0 = at(knot, 12345);
  return {x: (x0 + (at(knot + 1, 0) - x0) * blend) / Math.SQRT2,
    y: (y0 + (at(knot + 1, 12345) - y0) * blend) / Math.SQRT2};
}
export function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
export function capVector(v: Vector, limit: number): Vector {
  const length = Math.hypot(v.x, v.y);
  return length > limit ? {x: v.x * limit / length, y: v.y * limit / length} : v;
}
export function validateNodes(nodes: readonly MarketNode[]): readonly MarketNode[] {
  if (nodes.length > 20) throw new Error('Too many nodes');
  const ids = new Set<number>();
  const validated = nodes.map(n => {
    if (!Number.isSafeInteger(n.id) || n.id < 0 || ids.has(n.id) || !/^[A-Z0-9]{1,8}$/.test(n.symbol)) throw new Error('Invalid node identity');
    for (const key of ['x', 'y', 'radius', 'gravity', 'fieldRadius', 'flowStrength', 'momentumN', 'volatilityN'] as const) {
      if (!Number.isFinite(n[key])) throw new Error(`Non-finite node ${key}`);
    }
    if (n.radius < 20 || n.radius > 110 || n.x < n.radius + CONFIG.radius || n.x > CONFIG.width - n.radius - CONFIG.radius ||
        n.y < n.radius + CONFIG.radius || n.y > CONFIG.height - n.radius - CONFIG.radius || n.fieldRadius <= n.radius) throw new Error('Invalid node geometry');
    ids.add(n.id);
    if(n.marketCap!==undefined&&(!Number.isFinite(n.marketCap)||n.marketCap<=0))throw new Error('Invalid market cap');
    if(n.volumeN!==undefined&&(!Number.isFinite(n.volumeN)||n.volumeN<0||n.volumeN>1))throw new Error('Invalid volume index');
    return Object.freeze({...n, gravity: clamp(n.gravity, 0, 8000000), fieldRadius: clamp(n.fieldRadius, n.radius + 1, 500),
      flowStrength: clamp(n.flowStrength, 0, 1200), momentumN: clamp(n.momentumN, -1, 1), volatilityN: clamp(n.volatilityN, 0, 1)});
  }).sort((a, b) => a.id - b.id);
  for (let i = 0; i < validated.length; i++) for (let j = i + 1; j < validated.length; j++) {
    const a = validated[i]!, b = validated[j]!;
    if (Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 2 * CONFIG.radius) throw new Error('Overlapping solid cores');
  }
  return Object.freeze(validated);
}
export function fieldAt(node: MarketNode, position: Vector, polarity: Polarity, seed: number, tick: number) {
  const rx = node.x - position.x, ry = node.y - position.y;
  const distance = Math.hypot(rx, ry), d = Math.max(distance, CONFIG.softening);
  const nx = rx / d, ny = ry / d;
  const gravityScale = node.gravity / (d * d + CONFIG.softening * CONFIG.softening);
  const falloff = Math.pow(Math.max(0, 1 - distance / node.fieldRadius), 2);
  const flowScale = node.flowStrength * polarity * node.momentumN * falloff;
  const noise = boundedNoise(seed, node.id, tick);
  const turbulenceScale = CONFIG.turbulenceStrength * node.volatilityN * falloff;
  const gravity = {x: nx * gravityScale, y: ny * gravityScale};
  const flow = {x: -nx * flowScale, y: -ny * flowScale};
  const turbulence = {x: noise.x * turbulenceScale, y: noise.y * turbulenceScale};
  return {gravity, flow, turbulence, total: {
    x: gravity.x + flow.x + turbulence.x, y: gravity.y + flow.y + turbulence.y}};
}
// M1 safe solid cores: no damage/death. Remove inward normal velocity only.
export function resolveContact(p: PlayerState, nodes: readonly MarketNode[],radius:number=CONFIG.radius): void {
  for (const n of nodes) {
    const dx = p.x - n.x, dy = p.y - n.y;
    const d = Math.hypot(dx, dy), min = n.radius + radius;
    if (d >= min) continue;
    const nx = d > 1e-9 ? dx / d : 1, ny = d > 1e-9 ? dy / d : 0;
    p.x = n.x + nx * min; p.y = n.y + ny * min;
    const inward = p.vx * nx + p.vy * ny;
    if (inward < 0) { p.vx -= inward * nx; p.vy -= inward * ny; }
  }
}
