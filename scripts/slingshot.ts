import { createSlingshotWorld, slingshotInput, step, checksum, SLINGSHOT_DURATION_TICKS } from '../packages/sim/dist/index.js';
let state = createSlingshotWorld(20260923);
const node = state.nodes[0]!;
let minDistance = Infinity;
let exit: {tick: number; speed: number} | undefined;
for (let tick = 0; tick < SLINGSHOT_DURATION_TICKS; tick++) {
  state = step(state, slingshotInput(tick));
  const d = Math.hypot(state.player.x - node.x, state.player.y - node.y);
  minDistance = Math.min(minDistance, d);
  if (!exit && d >= node.fieldRadius) exit = {tick: state.tick, speed: Math.hypot(state.player.vx, state.player.vy)};
}
console.log(JSON.stringify({seed: state.seed, initialSpeed: 100, exit, minDistance,
  coreContactDistance: node.radius + 14, ticks: state.tick, checksum: checksum(state)}, null, 2));
