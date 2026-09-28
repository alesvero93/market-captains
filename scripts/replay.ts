import { checksum, replay } from '../packages/sim/dist/index.js';
const inputs = Array.from({length: 10000}, (_, tick) => ({moveX: tick % 120 < 60 ? 1 : -1, moveY: tick % 200 < 100 ? 0.5 : -0.5}));
const state = replay(20260923, inputs);
console.log(JSON.stringify({seed: state.seed, ticks: state.tick, checksum: checksum(state), player: state.player}, null, 2));
