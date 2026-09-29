import test from 'node:test';
import assert from 'node:assert/strict';
import {Client,type Room} from '@colyseus/sdk';
import {createGameServer} from '../apps/server/dist/server.js';
import {SoloArena,MotionPredictor} from '../packages/sim/dist/index.js';
import {IDLE_ACTION,ARENA_SCHEMA_VERSION,type LobbySnapshot,type ArenaSnapshot} from '../packages/shared/dist/index.js';
const until=async(check:()=>boolean,ms=3500)=>{const end=Date.now()+ms;while(!check()){if(Date.now()>end)throw Error('Lobby transition timed out');await new Promise(r=>setTimeout(r,20));}};
async function fixture(wait:number){const {server,httpServer}=createGameServer({lobbyWaitMs:wait});await server.listen(0,'127.0.0.1');const addr=httpServer.address();assert.ok(addr&&typeof addr!=='string');const client=new Client(`http://127.0.0.1:${addr.port}`);const rooms:Room[]=[];
 const watch=async(join:Promise<Room>)=>{const room=await join;rooms.push(room);const data:{room:Room;lobby?:LobbySnapshot;arena?:ArenaSnapshot}={room};room.onMessage('lobby',(s:LobbySnapshot)=>data.lobby=s);room.onMessage('arena',(s:ArenaSnapshot)=>data.arena=s);return data;};
 return {client,watch,close:async()=>{for(const room of rooms)if(room.connection.isOpen)await room.leave();await server.gracefullyShutdown(false);}};
}
test('public matchmaking shares waiting lobby, deadline does not reset, then fills to ten and locks',async()=>{
 const f=await fixture(1600);try{
  const a=await f.watch(f.client.joinOrCreate('arena',{name:'A',lobbyWaitMs:0,botCount:0,durationTicks:120}));
  await until(()=>!!a.lobby);assert.ok(a.lobby!.remainingMs>0);assert.equal(a.arena,undefined);
  const before=a.lobby!.remainingMs;
  const b=await f.watch(f.client.joinOrCreate('arena',{name:'B'}));assert.equal(a.room.roomId,b.room.roomId);
  await until(()=>a.lobby?.players.length===2&&!!b.lobby);assert.equal(a.lobby!.hostId,a.room.sessionId);assert.ok(a.lobby!.remainingMs<=before);
  assert.equal(a.arena,undefined);await until(()=>!!a.arena&&!!b.arena);
  assert.equal(a.arena!.players.length,10);assert.equal(a.arena!.players.filter(p=>p.bot).length,8);assert.ok(a.arena!.remainingTicks>8850);
  await assert.rejects(f.client.joinById(a.room.roomId));
  const c=await f.watch(f.client.joinOrCreate('arena'));assert.notEqual(c.room.roomId,a.room.roomId);
 }finally{await f.close();}
});
test('optional invite joins exact lobby; only host may start early and host departure transfers control',async()=>{
 const f=await fixture(180000);try{
  const a=await f.watch(f.client.joinOrCreate('arena',{name:'HOST'}));
  const b=await f.watch(f.client.joinById(a.room.roomId,{name:'FRIEND'}));
  await until(()=>a.lobby?.players.length===2&&!!b.lobby);
  assert.ok(a.lobby!.remainingMs<=180000&&a.lobby!.remainingMs>176000);
  b.room.send('start');await new Promise(r=>setTimeout(r,150));assert.equal(a.arena,undefined);
  const remaining=a.lobby!.remainingMs;await a.room.leave();await until(()=>b.lobby?.hostId===b.room.sessionId);
  assert.ok(b.lobby!.remainingMs<=remaining);b.room.send('start');await until(()=>!!b.arena);
  assert.equal(b.arena!.players.length,10);assert.equal(b.arena!.players.filter(p=>p.bot).length,9);
  let dropped=false,reconnected=false;b.room.onDrop(()=>dropped=true);b.room.onReconnect(()=>reconnected=true);
  b.room.reconnection.minUptime=0;b.room.reconnection.delay=50;b.room.reconnection.minDelay=50;b.room.reconnection.maxDelay=100;
  const session=b.room.sessionId;b.room.connection.close(4010,'test reconnection');
  await until(()=>dropped&&reconnected);await until(()=>b.arena!.players.some(p=>p.id===session&&p.connected));assert.equal(b.room.sessionId,session);
 }finally{await f.close();}
});
test('full lobby starts immediately without bots and an eleventh player opens another lobby',async()=>{
 const f=await fixture(180000);try{
  const a=await f.watch(f.client.joinOrCreate('arena'));
  for(let i=1;i<10;i++)await f.watch(f.client.joinById(a.room.roomId));
  await until(()=>!!a.arena);assert.equal(a.arena!.players.length,10);assert.ok(a.arena!.players.every(p=>!p.bot));
  const overflow=await f.watch(f.client.joinOrCreate('arena'));assert.notEqual(overflow.room.roomId,a.room.roomId);
 }finally{await f.close();}
});
test('solo supports exactly 3, 4 or 5 bots, while prediction obeys shared whale polarity',()=>{
 for(const count of [3,4,5] as const){const solo=new SoloArena(83,'P',0,undefined,2,count);assert.equal(solo.snapshot().players.length,count+1);}
 const solo=new SoloArena(83,'P',0),snapshot=solo.snapshot();snapshot.globalPolarity=1;
 const predictor=new MotionPredictor();predictor.accept(snapshot);predictor.push({schemaVersion:ARENA_SCHEMA_VERSION,seq:0,clientTick:0,...IDLE_ACTION,moveX:1,polarity:-1});
 assert.equal(predictor.player!.polarity,1);
});
