import test from 'node:test';
import assert from 'node:assert/strict';
import { addPlayer, createMatch, stepMatch, syntheticMarket, matchChecksum, botAction, predictMotion } from '../packages/sim/dist/index.js';
import { IDLE_ACTION, ARENA_SCHEMA_VERSION } from '../packages/shared/dist/index.js';
import { ArenaInputQueue } from '../apps/server/dist/arena-input.js';
import { replayMatch, type ReplayRecord } from '../apps/server/dist/replay.js';

test('deposit requires 90 uninterrupted ticks and preserves banked score on elimination',()=>{
 let s=addPlayer(createMatch(42),'p','Pilot');Object.assign(s.players[0]!,{x:s.gates[0]!.x,y:s.gates[0]!.y,cargo:50,protectedUntil:0});
 const bank={...IDLE_ACTION,bank:true};for(let i=0;i<89;i++)s=stepMatch(s,{p:bank});
 assert.equal(s.players[0]!.banked,0);assert.equal(s.players[0]!.bankTicks,89);
 s=stepMatch(s,{p:bank});assert.equal(s.players[0]!.banked,50);assert.equal(s.players[0]!.cargo,0);
 Object.assign(s.players[0]!,{cargo:30,integrity:0});s=stepMatch(s,{});
 assert.equal(s.players[0]!.banked,50);assert.equal(s.players[0]!.cargo,0);assert.ok(s.players[0]!.respawnTick>s.tick);
 for(let i=0;i<90;i++)s=stepMatch(s,{});assert.equal(s.players[0]!.respawnTick,0);assert.equal(s.players[0]!.banked,50);
});
test('release interrupts deposit; wallet shields deposits from pulses',()=>{
 let s=addPlayer(addPlayer(createMatch(42),'a','A'),'b','B');
 Object.assign(s.players[0]!,{x:s.gates[0]!.x,y:s.gates[0]!.y,cargo:50,bankTicks:50,protectedUntil:0});
 Object.assign(s.players[1]!,{x:s.gates[0]!.x+70,y:s.gates[0]!.y,protectedUntil:0});
 s=stepMatch(s,{a:{...IDLE_ACTION,bank:true},b:{...IDLE_ACTION,pulse:true}});
 assert.equal(s.players[0]!.bankTicks,51);assert.equal(s.metrics.pulses,1);assert.equal(s.players[1]!.energy,75);
 s=stepMatch(s,{b:{...IDLE_ACTION,pulse:true}});assert.equal(s.metrics.pulses,1);
 Object.assign(s.players[0]!,{bankTicks:20});s=stepMatch(s,{});assert.equal(s.players[0]!.bankTicks,0);
});
test('fragments have one owner; cargo mass reduces boost response and energy is bounded',()=>{
 let s=addPlayer(createMatch(1),'p','P');Object.assign(s.players[0]!,{x:s.gates[0]!.x,y:s.gates[0]!.y});s.fragments=[{id:1,x:s.gates[0]!.x,y:s.gates[0]!.y,vx:0,vy:0,value:5,event:false}];
 s=stepMatch(s,{});assert.equal(s.players[0]!.cargo,5);assert.equal(s.fragments.length,0);s=stepMatch(s,{});assert.equal(s.players[0]!.cargo,5);
 const light={...s.players[0]!,cargo:0},heavy={...light,cargo:500};const action={...IDLE_ACTION,moveX:1,boost:true};
 const a=predictMotion(light,[],action,1,0),b=predictMotion(heavy,[],action,1,0);assert.ok(a.vx>b.vx);assert.ok(a.energy<light.energy);
 let p=light;for(let i=0;i<1000;i++)p=predictMotion(p,[],action,1,i);assert.ok(p.energy>=0&&p.energy<=100);
});
test('input gate rejects injection and reordering, preserves one-shot pulse and stops stale input',()=>{
 const q=new ArenaInputQueue(),input={schemaVersion:ARENA_SCHEMA_VERSION,seq:1,clientTick:1,...IDLE_ACTION,pulse:true,moveX:1};
 assert.equal(q.receive({...input,cargo:999},0),false);assert.equal(q.receive(input,0),true);assert.equal(q.receive(input,0),false);
 assert.equal(q.consume(0).pulse,true);assert.equal(q.consume(1).pulse,false);assert.equal(q.consume(15).moveX,0);assert.equal(q.ackSeq,1);
});
test('stale feed suppresses surges; match closes and freezes at configured end',()=>{
 let s=createMatch(1,{...syntheticMarket(),mode:'STALE'},1200);for(let i=0;i<1200;i++)s=stepMatch(s,{});
 assert.equal(s.surge,null);assert.equal(s.phase,'finished');assert.equal(s.closeRadius,230);assert.equal(stepMatch(s,{}),s);
 const volatile={...syntheticMarket(),nodes:syntheticMarket().nodes.map(n=>({...n,volatilityN:.8}))};
 let live=createMatch(1,volatile);for(let i=0;i<660;i++)live=stepMatch(live,{});assert.equal(live.surge?.stage,'telegraph');
});
test('multiplayer replay reconstructs authoritative economy and bot decisions exactly',()=>{
 const market=syntheticMarket();let s=createMatch(20260923,market,1200);
 const records:ReplayRecord[]=[{type:'start',seed:s.seed,market,durationTicks:1200}];
 for(let i=0;i<4;i++){const id=`bot-${i}`;s=addPlayer(s,id,id,true);records.push({type:'join',id,name:id,bot:true});}
 for(let i=0;i<1200;i++){const actions=Object.fromEntries(s.players.map(p=>[p.id,botAction(s,p)]));records.push({type:'tick',actions});s=stepMatch(s,actions);}
 records.push({type:'checksum',checksum:matchChecksum(s)});assert.equal(matchChecksum(replayMatch(JSON.parse(JSON.stringify(records)))),matchChecksum(s));assert.ok(s.metrics.pickups>0);
});
