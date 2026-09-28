import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionPredictor, addPlayer, createMatch, predictMotion } from '../packages/sim/dist/index.js';
import { ARENA_SCHEMA_VERSION, IDLE_ACTION, type ArenaSnapshot, type ArenaInput, type Contestant } from '../packages/shared/dist/index.js';
const state=addPlayer(createMatch(42),'p','Pilot');
const snapshot=(tick:number,p:Contestant):ArenaSnapshot=>({schemaVersion:ARENA_SCHEMA_VERSION,matchId:'test',selfId:'p',seed:42,tick,ackSeq:tick-1,players:[p],nodes:state.nodes,fragments:[],gates:state.gates,events:[],remainingTicks:18000-tick,phase:'playing',closeRadius:1000,surge:null,marketVersion:1,marketMode:'SYNTHETIC',marketSourceTime:null,marketMessage:'test'});
const input=(seq:number):ArenaInput=>({schemaVersion:ARENA_SCHEMA_VERSION,seq,clientTick:seq,...IDLE_ACTION,moveX:seq%60<30?1:-1,moveY:.3,polarity:1});
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
