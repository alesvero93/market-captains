import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import path from 'node:path';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/server/dist/server.js';
import { originGuard } from '../apps/server/dist/client-assets.js';
import type { ArenaSnapshot } from '../packages/shared/dist/index.js';

test('compiled frontend and real multiplayer share one port; private paths and foreign origins are blocked',{timeout:12000},async()=>{
 const origin='https://demo.example.test';
 const {server,httpServer}=createGameServer({clientDirectory:path.resolve('apps/client/dist'),publicOrigin:origin,botCount:0});
 await server.listen(0,'127.0.0.1');const address=httpServer.address();assert.ok(address&&typeof address!=='string');const endpoint=`http://127.0.0.1:${address.port}`;let room:Room|undefined;
 try{
   const response=await fetch(endpoint);assert.equal(response.status,200);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
   const html=await response.text();assert.equal(Number(response.headers.get('content-length')),Buffer.byteLength(html));assert.ok(html.includes('MARKET CAPTAINS'));assert.ok(!html.includes('/@vite/client'));
   const asset=html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];assert.ok(asset);const js=await fetch(endpoint+asset);assert.equal(js.status,200);assert.ok(js.headers.get('content-type')?.includes('javascript'));
   for(const target of ['/.env.local','/apps/server/.env.local','/.data/cmc-budget.json','/assets/%2e%2e%2f.env.local','/src/arena.ts','/assets/missing.js'])assert.equal((await fetch(endpoint+target)).status,404,target);
   assert.equal((await fetch(endpoint+'/health',{headers:{Origin:'https://untrusted.example'}})).status,403);
   const health=await fetch(endpoint+'/health',{headers:{Origin:origin}});assert.equal(health.status,200);assert.ok(Number(health.headers.get('content-length'))>0);
   const expired=await fetch(endpoint+'/matchmake/joinById/expired-test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(expired.status,400);assert.equal((await expired.json() as {code:number}).code,522);
   const status=await new Promise<number>((resolve,reject)=>{const req=request(endpoint+'/any/any',{headers:{Origin:'https://untrusted.example',Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':'dGhlIHNhbXBsZSBub25jZQ=='}},res=>{res.resume();resolve(res.statusCode??0);});req.on('upgrade',(_res,socket)=>{socket.destroy();reject(Error('Foreign origin upgraded'));});req.on('error',reject);req.setTimeout(2000,()=>req.destroy(Error('Upgrade timed out')));req.end();});assert.equal(status,403);
   room=await new Client(endpoint).joinOrCreate('arena');const connected=room;
   const snapshot=await new Promise<ArenaSnapshot>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No snapshot')),2000);connected.onMessage('arena',(s:ArenaSnapshot)=>{clearTimeout(timer);resolve(s);});});assert.equal(snapshot.selfId,room.sessionId);assert.equal(snapshot.players.length,1);
 }finally{if(room?.connection.isOpen)await room.leave();await server.gracefullyShutdown(false);}
});
test('origin configuration requires exact HTTP(S) origins; absence permits non-browser clients',()=>{
 assert.throws(()=>originGuard(['https://demo.example/path']));assert.throws(()=>originGuard(['null']));const guard=originGuard(['https://demo.example']);
 assert.equal(guard(new Request('https://demo.example')),undefined);assert.equal(guard(new Request('https://demo.example',{headers:{Origin:'null'}}))?.status,403);
});

