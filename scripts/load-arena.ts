import { performance } from 'node:perf_hooks';
import { addPlayer, createMatch, botAction, stepMatch, matchChecksum } from '../packages/sim/dist/index.js';
let state=createMatch(20260923);for(let i=0;i<10;i++)state=addPlayer(state,`bot-${i}`,`BOT ${i}`,true);
const times:number[]=[];for(let i=0;i<18000;i++){const begin=performance.now();const actions=Object.fromEntries(state.players.map(p=>[p.id,botAction(state,p)]));state=stepMatch(state,actions);times.push(performance.now()-begin);}
times.sort((a,b)=>a-b);console.log(JSON.stringify({players:state.players.length,ticks:state.tick,phase:state.phase,checksum:matchChecksum(state),meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1),metrics:state.metrics},null,2));
