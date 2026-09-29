import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,addPlayer,stepMatch,predictMotion,playerRadius,MATCH,CLOSE_CENTER,mouseSteering,accelerationAt,botAction,MEMECOINS} from '../packages/sim/dist/index.js';
import {IDLE_ACTION} from '../packages/shared/dist/index.js';
const empty=()=>{const s=addPlayer(createMatch(83),'a','A');s.nodes=[];s.baseNodes=[];s.fragments=[];s.hackerWindows=[];return s;};
test('Bitcoin current is tangential, reverses and never pulls inward; idle still brakes',()=>{
 const s=createMatch(83),sun=s.nodes.find(n=>n.id===1)!;
 const player={id:'a',x:sun.x+150,y:sun.y,vx:0,vy:0,polarity:1 as const};
 const state={tick:0,seed:83,rngState:83,player,nodes:[sun]};
 const a=accelerationAt(state,{moveX:1,moveY:0,polarity:1,arcade:true});
 const b=accelerationAt(state,{moveX:1,moveY:0,polarity:-1,arcade:true});
 assert.equal(a.x,380);assert.equal(b.x,380);assert.ok(a.y>0&&b.y<0);assert.equal(a.y,-b.y);
 assert.deepEqual(accelerationAt(state,{moveX:0,moveY:0,arcade:true}),{x:0,y:0});
});
test('solar halo drains health and core contact kills even during spawn protection',()=>{
 let s=addPlayer(createMatch(83),'a','A');const sun=s.nodes.find(n=>n.id===1)!;
 Object.assign(s.players[0]!,{x:sun.x-180,y:sun.y,protectedUntil:99999});
 s=stepMatch(s,{});assert.ok(s.players[0]!.integrity<MATCH.health);assert.equal(s.players[0]!.respawnTick,0);
 Object.assign(s.players[0]!,{x:sun.x-sun.radius-playerRadius(s.players[0]!),y:sun.y});
 s=stepMatch(s,{});assert.equal(s.players[0]!.integrity,0);assert.ok(s.players[0]!.respawnTick>s.tick);
});
test('only the active wallet leader changes shared current, ties are stable and cooldown applies',()=>{
 let s=addPlayer(empty(),'b','B');Object.assign(s.players[0]!,{banked:50});Object.assign(s.players[1]!,{banked:20});
 s=stepMatch(s,{b:{...IDLE_ACTION,polarity:-1}});assert.equal(s.globalPolarity,1);assert.equal(s.players.find(p=>p.whale)?.id,'a');
 s=stepMatch(s,{a:{...IDLE_ACTION,polarity:-1}});assert.equal(s.globalPolarity,-1);assert.ok(s.players.every(p=>p.polarity===-1));
 s=stepMatch(s,{a:{...IDLE_ACTION,polarity:1}});assert.equal(s.globalPolarity,-1);
 s.players[1]!.banked=50;s=stepMatch(s,{});assert.equal(s.players.find(p=>p.whale)?.id,'a');
 s.players[1]!.banked=60;s=stepMatch(s,{});assert.equal(s.players.find(p=>p.whale)?.id,'b');
});
test('one ten-point diamond per three seconds excludes current whale, former whale can collect it',()=>{
 let s=addPlayer(empty(),'b','B');Object.assign(s.players[0]!,{x:200,y:200,banked:50});Object.assign(s.players[1]!,{x:1000,y:800});
 for(let i=0;i<90;i++)s=stepMatch(s,{});
 const drops=s.fragments.filter(f=>f.diamond);assert.equal(drops.length,1);assert.equal(drops[0]!.value,10);assert.equal(s.players[0]!.cargo,0);
 s.players[1]!.banked=60;s=stepMatch(s,{});assert.equal(s.players[0]!.cargo,10);assert.equal(s.fragments.filter(f=>f.diamond).length,0);
});
test('one seeded memecoin drops 450 points across exactly 30 seconds with bounded fragments',()=>{
 let s=empty();s.players=[];const names=new Set<string>();
 for(let seed=0;seed<50;seed++)names.add(createMatch(seed).airdrop.name);
 assert.equal(names.size,MEMECOINS.length);const start=s.airdrop.start,end=s.airdrop.end;assert.equal(end-start,900);
 s.tick=start-1;
 for(let i=0;i<900;i++){s=stepMatch(s,{});assert.ok(s.fragments.length<=MATCH.fragmentCap);}
 assert.equal(s.fragments.filter(f=>f.event).length,30);assert.equal(s.fragments.reduce((n,f)=>n+f.value,0),450);
 for(let i=0;i<90;i++)s=stepMatch(s,{});assert.equal(s.fragments.filter(f=>f.event).length,30);
});
test('storm damage penetrates protection, ramps up and leaves a usable final wallet',()=>{
 let s=empty();s.tick=8800;Object.assign(s.players[0]!,{x:80,y:80,protectedUntil:99999});
 const before=s.players[0]!.integrity;s=stepMatch(s,{});assert.ok(before-s.players[0]!.integrity>1.5);
 s.tick=8998;s=stepMatch(s,{});assert.ok(s.gates.some(g=>Math.hypot(g.x-CLOSE_CENTER.x,g.y-CLOSE_CENTER.y)+g.radius<s.closeRadius));
 s.tick=8800;s.players[0]!.respawnTick=8801;s.players[0]!.integrity=0;s=stepMatch(s,{});
 assert.equal(s.players[0]!.respawnTick,0);assert.ok(Math.hypot(s.players[0]!.x-CLOSE_CENTER.x,s.players[0]!.y-CLOSE_CENTER.y)<s.closeRadius);
 assert.ok(s.fragments.length<=MATCH.fragmentCap);
});
test('mouse steering reaches and settles near the cursor; boost is stronger but uses fuel',()=>{
 let p={...empty().players[0]!,x:100,y:100};const target={x:450,y:210};
 for(let i=0;i<360;i++)p=predictMotion(p,[],{...IDLE_ACTION,...mouseSteering(p,target)},83,i);
 assert.ok(Math.hypot(p.x-target.x,p.y-target.y)<15);assert.ok(Math.hypot(p.vx,p.vy)<3);
 const boost=predictMotion(p,[],{...IDLE_ACTION,moveX:1,boost:true},83,400);
 const normal=predictMotion(p,[],{...IDLE_ACTION,moveX:1},83,400);
 assert.ok(boost.vx>normal.vx*1.8);assert.ok(boost.energy<normal.energy);assert.equal(boost.integrity,normal.integrity);
});
test('difficulty changes strategy without bonus speed or health, all three levels finish bounded matches',()=>{
 const scores:number[]=[];
 for(const difficulty of [1,2,3] as const){let total=0;
  for(const seed of [83,85,20260923]){let s=createMatch(seed);s.difficulty=difficulty;for(let i=1;i<=3;i++)s=addPlayer(s,`bot-${i}`,'BOT',true);
   for(let tick=0;tick<MATCH.durationTicks;tick++)s=stepMatch(s,Object.fromEntries(s.players.map(p=>[p.id,botAction(s,p)])));
   assert.equal(s.phase,'finished');assert.equal(s.players.length,3);assert.ok(s.fragments.length<=MATCH.fragmentCap);assert.ok(s.players.every(p=>Number.isFinite(p.x)&&p.integrity<=MATCH.health));
   total+=s.players.reduce((sum,p)=>sum+p.banked,0);
  }scores.push(total);
 }assert.ok(scores[1]!>scores[0]!*1.1);assert.ok(scores[2]!>scores[0]!*1.1);
});
