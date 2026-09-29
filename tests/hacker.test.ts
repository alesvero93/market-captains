import test from 'node:test';
import assert from 'node:assert/strict';
import {addPlayer,createMatch,stepMatch,hackerSchedule,botAction,MATCH,matchChecksum} from '../packages/sim/dist/index.js';
import {IDLE_ACTION} from '../packages/shared/dist/index.js';

test('hacker has two seeded, non-overlapping 60/60-second visits before market close',()=>{
 const starts=new Set<number>();
 for(let seed=0;seed<300;seed++){
  const w=hackerSchedule(seed,MATCH.durationTicks);assert.equal(w.length,2);
  assert.deepEqual(w.map(x=>x.end-x.start),[1800,1800]);
  assert.ok(w[0]!.start>=600&&w[0]!.end<w[1]!.start&&w[1]!.end<=14400);
  assert.deepEqual(w,hackerSchedule(seed,MATCH.durationTicks));starts.add(w[0]!.start);
 }
 assert.ok(starts.size>20);assert.deepEqual(hackerSchedule(4,120),[]);
});

test('hacker uses an existing bot slot, leaves humans alone at full capacity and disappears at window end',()=>{
 let s=createMatch(9);for(let i=0;i<5;i++)s=addPlayer(s,`p${i}`,`P${i}`,i===0);
 const start=s.hackerWindows[0]!.start;s.tick=start-1;s=stepMatch(s,{});
 assert.equal(s.players.length,5);assert.equal(s.players.filter(p=>p.hacker).length,1);
 s.tick=s.hackerWindows[0]!.end-1;s=stepMatch(s,{});assert.equal(s.players.filter(p=>p.hacker).length,0);
 s.players.forEach(p=>p.bot=false);s.tick=start-1;s=stepMatch(s,{});assert.equal(s.players.filter(p=>p.hacker).length,0);
});

test('contact drains cargo gradually, protects banked points and stops immediately out of reach',()=>{
 let s=addPlayer(addPlayer(createMatch(12),'bot','Bot',true),'human','Human');
 s.tick=s.hackerWindows[0]!.start-1;s=stepMatch(s,{});s.nodes=[];s.baseNodes=[];s.fragments=[];
 const h=s.players.find(p=>p.hacker)!,p=s.players.find(p=>!p.bot)!;
 Object.assign(h,{x:500,y:100,vx:0,vy:0});Object.assign(p,{x:500,y:100,cargo:40,banked:80,protectedUntil:0});
 const before=matchChecksum(s);
 let end=s;for(let i=0;i<30;i++)end=stepMatch(end,{});
 assert.equal(matchChecksum(s),before,'step must not mutate its input');
 assert.equal(end.players.find(p=>!p.bot)!.cargo,38);assert.equal(end.players.find(p=>!p.bot)!.banked,80);
 const victim=end.players.find(p=>!p.bot)!;victim.x=1000;
 for(let i=0;i<30;i++)end=stepMatch(end,{});
 assert.equal(end.players.find(p=>!p.bot)!.cargo,38);
});

test('wallet shield excludes hacker, including pulse knockback; deposits remain intact',()=>{
 let s=addPlayer(addPlayer(createMatch(12),'bot','Bot',true),'human','Human');
 s.tick=s.hackerWindows[0]!.start-1;s=stepMatch(s,{});s.nodes=[];s.baseNodes=[];s.fragments=[];
 Object.assign(s.players.find(p=>p.hacker)!,{x:s.gates[0]!.x,y:s.gates[0]!.y});
 Object.assign(s.players.find(p=>!p.bot)!,{x:s.gates[0]!.x,y:s.gates[0]!.y,cargo:40,banked:50,protectedUntil:0});
 for(let i=0;i<90;i++)s=stepMatch(s,{human:{...IDLE_ACTION,bank:true}});
 assert.equal(s.players.find(p=>!p.bot)!.banked,90);
 const hacker=s.players.find(p=>p.hacker)!;
 for(const gate of s.gates)assert.ok(Math.hypot(hacker.x-gate.x,hacker.y-gate.y)>=gate.radius+47.99);
});

test('bots do not waste pulses on nearby empty captains and protect an active deposit',()=>{
 let s=addPlayer(addPlayer(createMatch(5),'bot','Bot',true),'p','P');
 Object.assign(s.players[0]!,{x:s.gates[0]!.x,y:s.gates[0]!.y,cargo:50,bankTicks:30});
 Object.assign(s.players[1]!,{x:120,y:110,cargo:0});
 const action=botAction(s,s.players[0]!);assert.equal(action.pulse,false);assert.equal(action.boost,false);
 s.players[0]!.cargo=0;s.players[0]!.bankTicks=0;assert.equal(botAction(s,s.players[0]!).pulse,false);
});

test('settled neighbours can finish deposits without endless contact interruptions',()=>{
 let s=addPlayer(addPlayer(createMatch(5),'a','A'),'b','B');s.nodes=[];s.baseNodes=[];s.fragments=[];
 Object.assign(s.players[0]!,{x:s.gates[0]!.x-10,y:s.gates[0]!.y,cargo:40});Object.assign(s.players[1]!,{x:s.gates[0]!.x+10,y:s.gates[0]!.y,cargo:40});
 for(let i=0;i<90;i++)s=stepMatch(s,{a:{...IDLE_ACTION,bank:true},b:{...IDLE_ACTION,bank:true}});
 assert.equal(s.players[0]!.banked,40);assert.equal(s.players[1]!.banked,40);
});

test('full seeded match bots collect and bank actively without pulse spam',()=>{
 let s=createMatch(20260923);for(let i=0;i<5;i++)s=addPlayer(s,`bot-${i}`,`BOT ${i}`,true);
 for(let i=0;i<MATCH.durationTicks;i++)s=stepMatch(s,Object.fromEntries(s.players.map(p=>[p.id,botAction(s,p)])));
 assert.equal(s.phase,'finished');/* Higher-value drops and solar avoidance change pickup count; require useful banked results. */assert.ok(s.metrics.banks>70);assert.ok(s.metrics.pickups>600);assert.ok(s.players.reduce((sum,p)=>sum+p.banked,0)>3500);assert.ok(s.metrics.pulses<500);
 assert.equal(s.players.length,5);assert.ok(s.players.every(p=>!p.hacker));
});
