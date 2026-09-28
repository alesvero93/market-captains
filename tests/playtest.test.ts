import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/server/dist/server.js';
import { addPlayer, createMatch, stepMatch, syntheticMarket, playerRadius, validateNodes, orbitNode } from '../packages/sim/dist/index.js';
import { playerIdentity, type ArenaSnapshot } from '../packages/shared/dist/index.js';

test('five to seven separated planets, seeded selection, BTC center and slow ETH orbit for a full match',()=>{
 let s=createMatch(85);assert.ok(s.nodes.length>=5&&s.nodes.length<=7);
 assert.deepEqual(s.nodes,createMatch(85).nodes);
 const eth=s.nodes.find(n=>n.id===1027)!;
 for(let i=0;i<18000;i++){
   s=stepMatch(s,{});
   if(i%30===0){validateNodes(s.nodes);const btc=s.nodes.find(n=>n.id===1)!;assert.equal(btc.x,720);assert.equal(btc.y,450);}
 }
 assert.notEqual(s.nodes.find(n=>n.id===1027)!.x,eth.x);
 assert.ok(s.gates.some(g=>Math.hypot(g.x-720,g.y-450)+g.radius<=s.closeRadius));
 const ranked={...syntheticMarket(),nodes:syntheticMarket().nodes.map(n=>({...n,marketRank:n.id===5426?25:5}))};
 assert.equal(createMatch(85,ranked).nodes.some(n=>n.id===5426),false);
});

test('random layouts vary count and position, scale altcoins by cap and clear wallets and ETH orbit',()=>{
 const counts=new Set<number>(),layouts=new Set<string>();
 const market=syntheticMarket();market.nodes=market.nodes.map(n=>({...n,marketCap:n.gravity**2+n.id*100000000}));
 for(let seed=0;seed<120;seed++){
  const s=createMatch(seed,market),alts=s.nodes.filter(n=>n.id!==1&&n.id!==1027).sort((a,b)=>a.marketCap!-b.marketCap!);
  counts.add(alts.length);layouts.add(alts.map(n=>`${n.id}:${n.x.toFixed(1)}:${n.y.toFixed(1)}`).join('|'));
  for(let i=1;i<alts.length;i++){assert.ok(alts[i]!.radius>alts[i-1]!.radius);assert.ok(alts[i]!.fieldRadius>alts[i-1]!.fieldRadius);}
  for(const n of alts)for(const g of s.gates)assert.ok(Math.hypot(n.x-g.x,n.y-g.y)>n.radius+g.radius+34);
  for(let tick=0;tick<5400;tick+=90)validateNodes(s.nodes.map(n=>orbitNode(n,tick)));
 }
 assert.deepEqual([...counts].sort(),[3,4,5]);assert.equal(layouts.size,120);
});
test('wallet growth is bounded, survives cargo deposit and validates avatar/name',()=>{
 const p=addPlayer(createMatch(1),'p','P').players[0]!;
 assert.ok(playerRadius({...p,banked:400})>playerRadius(p));
 assert.ok(playerRadius({...p,banked:1e9,cargo:1000})<=34);
 assert.equal(playerIdentity({name:'<script>é',avatar:200}).avatar,0);
 assert.equal(playerIdentity({name:'',avatar:4}).name,'SATCAT');
 assert.ok(playerIdentity({name:'x'.repeat(100)}).name.length<=16);
});
test('arena creation is bounded and a released slot becomes available', {timeout:15000},async()=>{
 const {server,httpServer}=createGameServer({botCount:0});await server.listen(0,'127.0.0.1');const address=httpServer.address();assert.ok(address&&typeof address!=='string');
 const client=new Client(`http://127.0.0.1:${address.port}`),rooms:Room[]=[];
 try{for(let i=0;i<8;i++){const r=await client.create('arena');r.onMessage('arena',()=>{});rooms.push(r);}
 await assert.rejects(client.create('arena'));
 await rooms.pop()!.leave();await new Promise(r=>setTimeout(r,100));
 const replacement=await client.create('arena');replacement.onMessage('arena',()=>{});rooms.push(replacement);
 }finally{for(const r of rooms)if(r.connection.isOpen)await r.leave();await server.gracefullyShutdown(false);}
});
test('10 total slots replace bots, overflow opens another arena and invites join the same room', {timeout:15000},async()=>{
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert.ok(address&&typeof address!=='string');
 const client=new Client(`http://127.0.0.1:${address.port}`),rooms:Room[]=[];let snapshot:ArenaSnapshot|undefined;
 const until=async(f:()=>boolean)=>{const end=Date.now()+3000;while(!f()){if(Date.now()>end)throw Error('timeout');await new Promise(r=>setTimeout(r,20));}};
 try{
  const first=await client.joinOrCreate('arena',{name:'MOON',avatar:3});rooms.push(first);first.onMessage('arena',(s:ArenaSnapshot)=>snapshot=s);
  const friend=await client.joinById(first.roomId,{name:'FRIEND',avatar:7});rooms.push(friend);friend.onMessage('arena',()=>{});
  for(let i=2;i<10;i++){const r=await client.joinOrCreate('arena');r.onMessage('arena',()=>{});rooms.push(r);assert.equal(r.roomId,first.roomId);}
  await until(()=>snapshot?.players.length===10&&snapshot.players.every(p=>!p.bot));
  assert.equal(snapshot!.players.find(p=>p.id===first.sessionId)!.avatar,3);
  const overflow=await client.joinOrCreate('arena');overflow.onMessage('arena',()=>{});rooms.push(overflow);assert.notEqual(overflow.roomId,first.roomId);
  await assert.rejects(client.joinById(first.roomId));
  await friend.leave();rooms.splice(1,1);await until(()=>snapshot!.players.filter(p=>p.bot).length===1);assert.equal(snapshot!.players.length,10);
 }finally{for(const r of rooms)if(r.connection.isOpen)await r.leave();await server.gracefullyShutdown(false);}
});

