import test from 'node:test';
import assert from 'node:assert/strict';
import { SoloArena, syntheticMarket, createMatch } from '../packages/sim/dist/index.js';
import { IDLE_ACTION } from '../packages/shared/dist/index.js';
import { createGameServer } from '../apps/server/dist/server.js';
test('five-minute match retains two one-minute hacker visits before the last minute',()=>{
 const match=createMatch(83);assert.equal(match.durationTicks,5*60*30);assert.equal(match.closeTicks,60*30);
 assert.equal(match.hackerWindows.length,2);
 for(const visit of match.hackerWindows){assert.equal(visit.end-visit.start,60*30);assert.ok(visit.end<=match.durationTicks-match.closeTicks);}
});

test('solo play progresses deterministically without networking and keeps three bots',()=>{
 const a=new SoloArena(83,'Captain',0),b=new SoloArena(83,'Captain',0);
 const initial=a.snapshot().players.find(p=>p.id==='solo')!;
 for(let i=0;i<300;i++){const input={...IDLE_ACTION,moveX:1,polarity:1 as const};a.step(input);b.step(input);}
 assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(a.snapshot().players.length,4);
 assert.ok(Math.hypot(a.snapshot().players.find(p=>p.id==='solo')!.x-initial.x,a.snapshot().players.find(p=>p.id==='solo')!.y-initial.y)>50);
 const tick=a.snapshot().tick;a.market({...syntheticMarket(),mode:'STALE',message:'Delayed'});
 assert.equal(a.snapshot().tick,tick);assert.equal(a.snapshot().marketMode,'STALE');
});
test('single-player server exposes cached market data and disables arena matchmaking',async()=>{
 let reads=0;const frame=syntheticMarket();
 const {server,httpServer}=createGameServer({singlePlayer:true,market:{frame:()=>{reads++;return frame;}}});
 await server.listen(0,'127.0.0.1');const address=httpServer.address();assert.ok(address&&typeof address!=='string');
 const base=`http://127.0.0.1:${address.port}`;
 try{
  const response=await fetch(base+'/api/market');assert.equal(response.status,200);assert.deepEqual(await response.json(),frame);assert.equal(reads,1);
  const join=await fetch(base+'/matchmake/joinOrCreate/arena',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(join.status,400);
 }finally{await server.gracefullyShutdown(false);}
});
