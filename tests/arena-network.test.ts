import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/server/dist/server.js';
import { ARENA_SCHEMA_VERSION, IDLE_ACTION, type ArenaSnapshot } from '../packages/shared/dist/index.js';
test('two real clients share arena, cannot inject score/options, and see disconnect', {timeout:12000},async()=>{
 const {server,httpServer}=createGameServer({botCount:0});await server.listen(0,'127.0.0.1');const address=httpServer.address();assert.ok(address&&typeof address!=='string');
 const client=new Client(`http://127.0.0.1:${address.port}`);const rooms:Room[]=[];let a:ArenaSnapshot|undefined,b:ArenaSnapshot|undefined;
 const until=async(check:()=>boolean)=>{const deadline=Date.now()+3000;while(!check()){if(Date.now()>deadline)throw Error('Snapshot timed out');await new Promise(r=>setTimeout(r,20));}};
 try{const first=await client.joinOrCreate('arena',{botCount:4,durationTicks:120,replayDirectory:'invalid-client-path'});rooms.push(first);first.onMessage('arena',(s:ArenaSnapshot)=>a=s);
 const second=await client.joinOrCreate('arena');rooms.push(second);second.onMessage('arena',(s:ArenaSnapshot)=>b=s);await until(()=>a?.players.length===2&&b?.players.length===2);
 assert.equal(first.roomId,second.roomId);assert.ok(a!.remainingTicks>17000);assert.equal(a!.players.filter(p=>p.bot).length,0);
 first.send('input',{schemaVersion:ARENA_SCHEMA_VERSION,seq:0,clientTick:0,...IDLE_ACTION,polarity:1});await until(()=>a?.ackSeq===0&&b!.players.find(p=>p.id===first.sessionId)?.polarity===1);
 first.send('input',{schemaVersion:ARENA_SCHEMA_VERSION,seq:1,clientTick:1,...IDLE_ACTION,banked:9999});const tick=a!.tick;await until(()=>a!.tick>tick+4);assert.equal(a!.ackSeq,0);assert.equal(a!.players.find(p=>p.id===first.sessionId)!.banked,0);
 let dropped=false,reconnected=false;first.onDrop(()=>dropped=true);first.onReconnect(()=>reconnected=true);
 first.reconnection.minUptime=0;first.reconnection.delay=50;first.reconnection.minDelay=50;first.reconnection.maxDelay=100;
 const session=first.sessionId;first.connection.close(4010,'test network interruption');
 await until(()=>dropped&&reconnected);await until(()=>a!.ackSeq===-1);
 assert.equal(first.sessionId,session);assert.equal(a!.players.length,2);
 first.send('input',{schemaVersion:ARENA_SCHEMA_VERSION,seq:0,clientTick:0,...IDLE_ACTION,polarity:-1});
 await until(()=>a!.ackSeq===0&&b!.players.find(p=>p.id===session)?.polarity===-1);
 await second.leave();rooms.pop();await until(()=>a!.players.length===1);
 }finally{for(const r of rooms)if(r.connection.isOpen)await r.leave();await server.gracefullyShutdown(false);}
});


