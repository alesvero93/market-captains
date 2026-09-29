import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionPredictor, SnapshotBuffer, addPlayer, createMatch, predictMotion } from '../packages/sim/dist/index.js';
import { ARENA_SCHEMA_VERSION, IDLE_ACTION, type ArenaSnapshot, type ArenaInput, type Contestant } from '../packages/shared/dist/index.js';
const state=addPlayer(createMatch(42),'p','Pilot');
const snapshot=(tick:number,p:Contestant):ArenaSnapshot=>({schemaVersion:ARENA_SCHEMA_VERSION,matchId:'test',selfId:'p',seed:42,tick,ackSeq:tick-1,players:[p],nodes:state.nodes,fragments:[],gates:state.gates,events:[],remainingTicks:18000-tick,phase:'playing',closeRadius:1000,surge:null,marketVersion:1,marketMode:'SYNTHETIC',marketSourceTime:null,marketMessage:'test'});
const input=(seq:number):ArenaInput=>({schemaVersion:ARENA_SCHEMA_VERSION,seq,clientTick:seq,...IDLE_ACTION,moveX:seq%60<30?1:-1,moveY:.3,polarity:1});
test('remote interpolation stays continuous across late packets and resets between arenas',()=>{
 const buffer=new SnapshotBuffer();
 for(const [tick,time] of [[0,0],[2,66],[4,200]])buffer.push(snapshot(tick!,{...state.players[0]!,x:tick!*10}),time!);
 const x=(time:number)=>{const pair=buffer.sample(time)!;return pair.before.players[0]!.x+(pair.after.players[0]!.x-pair.before.players[0]!.x)*pair.alpha;};
 let previousX=x(120);for(let time=121;time<=320;time++){const next=x(time);assert.ok(next>=previousX&&next-previousX<1);previousX=next;}
 assert.equal(x(1000),40);buffer.reset();assert.equal(buffer.sample(1000),undefined);
});
test('a loaded captain can escape the strongest inward current without boosting',()=>{
 const node={...state.nodes[0]!,x:720,y:450,gravity:8000000,flowStrength:1200,momentumN:-1,volatilityN:1};
 for(const cargo of [0,500]){
  let p={...state.players[0]!,x:720+node.radius+40,y:450,vx:0,vy:0,cargo};const start=p.x;
  for(let tick=0;tick<90;tick++)p=predictMotion(p,[node],{...IDLE_ACTION,moveX:1,polarity:1},42,tick);
  assert.ok(p.x>start+70,`cargo ${cargo}: outward steering must escape`);
 }
});
test('arcade steering reverses momentum promptly in open space',()=>{
 let p={...state.players[0]!,x:720,y:450,vx:300,vy:0};
 for(let tick=0;tick<15;tick++)p=predictMotion(p,[],{...IDLE_ACTION,moveX:-1},42,tick);
 assert.ok(p.vx<0,'left steering should reverse rightward motion within half a second');
});
test('released controls brake to rest even inside a strong market halo',()=>{
 const node={...state.nodes[0]!,x:720,y:450,gravity:8000000,flowStrength:1200,momentumN:-1};
 let p={...state.players[0]!,x:850,y:450,vx:120,vy:60};
 for(let tick=0;tick<120;tick++)p=predictMotion(p,[node],IDLE_ACTION,42,tick);
 assert.equal(p.vx,0);assert.equal(p.vy,0);const stopped={...p};
 for(let tick=120;tick<180;tick++)p=predictMotion(p,[node],IDLE_ACTION,42,tick);
 assert.equal(p.x,stopped.x);assert.equal(p.y,stopped.y);
});
for(const delay of [3,9])test(`prediction reconciles ${delay*1000/30} ms delayed snapshots and skipped updates`,()=>{
 const model=new MotionPredictor();let authoritative={...state.players[0]!};const history=[snapshot(0,authoritative)];model.accept(history[0]!);
 for(let i=0;i<300;i++){
   const action=input(i);model.push(action);authoritative=predictMotion(authoritative,state.nodes,action,42,i);history.push(snapshot(i+1,authoritative));
   const index=i+1-delay;if(index>0&&i%5!==0)model.accept(history[index]!);
   assert.ok(model.player);assert.ok(Math.hypot(model.player.x-authoritative.x,model.player.y-authoritative.y)<1e-8);
   assert.ok(model.pendingCount<=delay+1);
 }
 assert.equal(model.accept(history[0]!),false);model.accept(history.at(-1)!);assert.equal(model.pendingCount,0);assert.deepEqual(model.player,authoritative);
});
test('prediction memory is bounded; reconnect, death and finished matches discard speculation',()=>{
 const model=new MotionPredictor();model.accept(snapshot(0,state.players[0]!));for(let i=0;i<200;i++)model.push(input(i));assert.equal(model.pendingCount,90);
 const dead={...state.players[0]!,respawnTick:250,integrity:0};model.accept(snapshot(201,dead));model.push(input(201));assert.deepEqual(model.player,dead);
 model.accept({...snapshot(203,state.players[0]!),phase:'finished'});assert.equal(model.pendingCount,0);assert.equal(model.push(input(204)),false);
 model.reset();model.accept(snapshot(0,state.players[0]!));assert.equal(model.push(input(0)),true);
});
