import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,addPlayer,stepMatch,botAction,elapsedMatchTick,SoloArena} from '../packages/sim/dist/index.js';
import {IDLE_ACTION} from '../packages/shared/dist/index.js';
test('1000 seeded layouts retain three separated safe wallets and a random reachable closing wallet',()=>{
 const destinations=new Set<string>();
 for(let seed=0;seed<1000;seed++){
  const s=createMatch(seed);assert.equal(s.gates.length,3);destinations.add(JSON.stringify(s.closeCenter));
  assert.ok(s.gates.some(g=>Math.hypot(g.x-s.closeCenter.x,g.y-s.closeCenter.y)+g.radius<230));
  for(const g of s.gates){assert.ok(Math.hypot(g.x-720,g.y-450)>=350);assert.ok(s.nodes.every(n=>n.id===1027||Math.hypot(g.x-n.x,g.y-n.y)>=n.radius+120));}
 }
 assert.ok(destinations.size>990);
});
test('five overlapping captains can all deposit; empty bots leave instead of guarding the wallet',()=>{
 let s=createMatch(42);for(let i=0;i<5;i++)s=addPlayer(s,String(i),String(i),i>0);
 s.nodes=[];s.baseNodes=[];s.fragments=[];
 for(const p of s.players)Object.assign(p,{x:s.gates[0]!.x,y:s.gates[0]!.y,cargo:40});
 for(let i=0;i<90;i++)s=stepMatch(s,Object.fromEntries(s.players.map(p=>[p.id,{...IDLE_ACTION,bank:true}])));
 assert.ok(s.players.every(p=>p.banked===40));s.fragments=[];
 const action=botAction(s,s.players[1]!);assert.ok(Math.hypot(action.moveX,action.moveY)>.1);assert.equal(action.bank,false);
});
test('absolute solo timeline catches up across hidden tabs and expires exactly at five minutes',()=>{
 const arena=new SoloArena(22,'P',0);let tick=0;
 for(const elapsed of [33,1000,61000,242000,301000]){const target=elapsedMatchTick(elapsed,tick);while(tick<target){arena.step(IDLE_ACTION);tick++;}}
 assert.equal(tick,9000);assert.equal(arena.snapshot().phase,'finished');assert.equal(arena.snapshot().remainingTicks,0);
 assert.equal(elapsedMatchTick(0,100),100);assert.equal(elapsedMatchTick(900000),9000);
});
