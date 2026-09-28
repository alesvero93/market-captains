import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CreditBudget } from '../apps/server/dist/market/budget.js';
import { MarketService } from '../apps/server/dist/market/service.js';
import { parseAccount } from '../apps/server/dist/market/normalize.js';
import { ARENA_NODES } from '../packages/sim/dist/index.js';
const start=Date.UTC(2026,8,23);
test('Basic may omit daily remaining: use local cap minus account usage, fail closed on malformed data',()=>{
 const account=(used:number)=>({data:{plan:{credit_limit_monthly:15000,rate_limit_minute:50},usage:{current_month:{credits_used:used,credits_left:15000-used},current_day:{credits_used:used}}}});
 assert.equal(parseAccount(account(12)).dayLeft,308);assert.equal(parseAccount(account(400)).dayLeft,0);
 assert.throws(()=>parseAccount(account(NaN)));assert.throws(()=>parseAccount({data:{usage:{current_month:{credits_used:0,credits_left:15000},current_day:{credits_used:0}}}}));
});
test('authorization rejection blocks future calls; shutdown waits for reserved request without starting quotes',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'liquidity-market-'));let calls=0,now=start;
 const rejected=new MarketService(dir,'test-key',async()=>{calls++;return Response.json({status:{credit_count:0,error_code:1001}},{status:401});},()=>now);
 try{await rejected.pollOnce();now+=3600000;await rejected.pollOnce();assert.equal(calls,1);assert.equal(rejected.stats().blocked,true);}finally{rejected.stop();rmSync(dir,{recursive:true,force:true});}
 const pendingDir=mkdtempSync(path.join(tmpdir(),'liquidity-market-'));let resolve!:(r:Response)=>void;calls=0;
 const pending=new MarketService(pendingDir,'test-key',()=>{calls++;return new Promise<Response>(r=>resolve=r);},()=>start);
 const run=pending.pollOnce();pending.stop();
 resolve(Response.json({data:{usage:{current_month:{credits_used:0,credits_left:15000},current_day:{credits_left:1000}}}}));await run;assert.equal(calls,1);
 const restarted=new MarketService(pendingDir,'test-key',async()=>{calls++;throw Error('unexpected');},()=>start);
 try{await restarted.pollOnce();assert.equal(calls,1);}finally{restarted.stop();rmSync(pendingDir,{recursive:true,force:true});}
});
const fixture=(now:number)=>({status:{credit_count:1,error_code:0},data:ARENA_NODES.map((n,i)=>({id:n.id,quote:{USD:{price:100+i,market_cap:1000000*(i+1),volume_24h:10000,percent_change_1h:i%2?-.5:.5,last_updated:new Date(now).toISOString()}}}))});
test('quota survives restart, refuses duplicate collector, daily cap and backwards clock',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'liquidity-budget-'));let b:CreditBudget|undefined;
 try{b=new CreditBudget(dir,'test',start);assert.throws(()=>new CreditBudget(dir,'test',start));assert.equal(b.claimPoll(start),true);b.updateAccount(start,0,15000,10000);
 for(let i=0;i<320;i++)assert.equal(b.reserve(start),true);assert.equal(b.reserve(start),false);b.close();b=new CreditBudget(dir,'test',start);assert.equal(b.stats().daily,320);assert.equal(b.claimPoll(start+1000),false);
 assert.equal(b.claimPoll(start+86400000),true);b.updateAccount(start+86400000,320,14680,10000);assert.equal(b.reserve(start+86400000),true);assert.equal(b.reserve(start),false);assert.equal(b.stats().blocked,true);
 }finally{b?.close();rmSync(dir,{recursive:true,force:true});}
});
test('unknown request retains reservation; unexpected credit cost stops future calls',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'liquidity-budget-'));const b=new CreditBudget(dir,'test',start);
 try{b.updateAccount(start,14999,100000,1000);assert.equal(b.reserve(start),false);assert.equal(b.reserve(start,true),true);b.reconcile(undefined);assert.equal(b.stats().monthly,1);b.reconcile(2);assert.equal(b.stats().monthly,2);assert.equal(b.reserve(start,true),false);}finally{b.close();rmSync(dir,{recursive:true,force:true});}
});
test('shared service batches ten IDs, caches across restart and labels stale data',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'liquidity-market-'));let now=start,calls=0;
 const fetcher=async(url:string)=>{calls++;if(url.includes('/key/info'))return Response.json({status:{credit_count:0},data:{usage:{current_month:{credits_used:0,credits_left:15000},current_day:{credits_left:1000}}}});assert.ok(url.includes('convert=USD'));assert.ok(url.includes('20947'));return Response.json(fixture(now));};
 let service=new MarketService(dir,'test-only-key',fetcher,()=>now);
 try{await Promise.all([service.pollOnce(),service.pollOnce(),service.pollOnce()]);assert.equal(calls,2);assert.equal(service.frame().mode,'LIVE');assert.equal(service.stats().monthly,1);service.stop();service=new MarketService(dir,'test-only-key',fetcher,()=>now);await service.pollOnce();assert.equal(calls,2);assert.equal(service.frame().mode,'LIVE');now+=13*60000;assert.equal(service.frame().mode,'STALE');now+=18*60000;assert.equal(service.frame().mode,'DEGRADED');}finally{service.stop();rmSync(dir,{recursive:true,force:true});}
});
test('missing key makes zero requests; malformed quotes never become live',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'liquidity-market-'));let calls=0;
 const noKey=new MarketService(dir,'',async()=>{calls++;throw Error('Unexpected');},()=>start);await noKey.pollOnce();assert.equal(calls,0);assert.equal(noKey.frame().mode,'SYNTHETIC');
 const bad=new MarketService(dir,'test-only-key',async(url)=>Response.json(url.includes('/key/info')?{data:{usage:{current_month:{credits_used:0,credits_left:15000},current_day:{credits_left:1000}}}}:{status:{credit_count:1},data:[]}),()=>start);
 try{await bad.pollOnce();assert.equal(bad.frame().mode,'DEGRADED');assert.equal(bad.stats().monthly,2);}finally{bad.stop();rmSync(dir,{recursive:true,force:true});}
});
