import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { MarketFrame } from '@liquidity/shared';
import { ARENA_NODES, syntheticMarket, validateNodes } from '@liquidity/sim';
import { CreditBudget } from './budget.js';
import { creditCount, decodeQuotes, normalizeQuotes, parseAccount, statusError } from './normalize.js';
const ORIGIN='https://pro-api.coinmarketcap.com';
type Fetcher=(url:string,options:RequestInit)=>Promise<Response>;
export class MarketService {
  private key:string;private budget:CreditBudget|undefined;private current:MarketFrame=syntheticMarket();
  private history=new Map<number,number[]>();private polling=false;private timer:ReturnType<typeof setInterval>|undefined;
  private failureCount=0;private error='';private fetchedLive=false;private stopRequested=false;
  constructor(private directory:string,key='',private fetcher:Fetcher=fetch,private now:()=>number=Date.now) {
    this.key=key.trim();
    if(!this.key)return;
    try {
      this.budget=new CreditBudget(directory,createHash('sha256').update(this.key).digest('hex'),this.now());
      const cache=path.join(directory,'market-cache.json');
      if(existsSync(cache)) {
        const saved=JSON.parse(readFileSync(cache,'utf8')) as {frame:MarketFrame;history:[number,number[]][]};
        if(saved.frame.mode!=='LIVE'||typeof saved.frame.sourceTime!=='number'||!Number.isFinite(saved.frame.sourceTime)||saved.frame.sourceTime>this.now()+60000||!Number.isSafeInteger(saved.frame.version)||saved.frame.version<1||
          typeof saved.frame.message!=='string'||!saved.frame.fragmentWeights||ARENA_NODES.some(n=>!Number.isFinite(saved.frame.fragmentWeights[String(n.id)])))throw new Error('Invalid cache');
        this.current={...saved.frame,nodes:validateNodes(saved.frame.nodes)};this.fetchedLive=true;
        if(Array.isArray(saved.history))for(const [id,prices] of saved.history)if(ARENA_NODES.some(n=>n.id===id)&&Array.isArray(prices)&&prices.every(p=>Number.isFinite(p)&&p>0))this.history.set(id,prices.slice(-12));
      }
    }catch{this.error='Invalid cache or credit ledger: API paused';this.budget?.close();this.budget=undefined;}
  }
  frame(now=this.now()):MarketFrame {
    if(!this.key)return syntheticMarket();
    if(!this.fetchedLive||this.current.sourceTime===null)return {...syntheticMarket(),mode:'DEGRADED',message:this.error||'Waiting for CMC · synthetic fallback fields'};
    const age=Math.max(0,now-this.current.sourceTime);
    const mode=age<=12*60000?'LIVE':age<=30*60000?'STALE':'DEGRADED';
    const liveMessage=ARENA_NODES.every(n=>(this.history.get(n.id)?.length??0)>=4)?'CoinMarketCap · shared update every 5 minutes':'CoinMarketCap · volatility warming up';
    return {...this.current,mode,message:mode==='LIVE'?liveMessage:mode==='STALE'?'Delayed CMC data · new live events paused':'CMC feed unavailable · last field attenuated'};
  }
  start(){if(!this.key||!this.budget)return;void this.pollOnce();this.timer=setInterval(()=>void this.pollOnce(),15000);this.timer.unref();}
  stop(){this.stopRequested=true;if(this.timer)clearInterval(this.timer);if(!this.polling){this.budget?.close();this.budget=undefined;}}
  stats(){return {enabled:!!this.key,...(this.budget?.stats()??{monthly:0,daily:0,requests:0,blocked:!!this.key}),hasLiveData:this.fetchedLive};}
  private async request(route:string):Promise<unknown> {
    const response=await this.fetcher(ORIGIN+route,{headers:{'X-CMC_PRO_API_KEY':this.key,Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
    if(response.status===401||response.status===403)this.budget!.suspend();
    if(Number(response.headers.get('content-length')??0)>2000000)throw new Error('Response too large');
    const text=await response.text();if(text.length>2000000)throw new Error('Response too large');
    const data:unknown=JSON.parse(text);this.budget!.reconcile(creditCount(data));
    // Diagnostic allowlist: never persist request headers, key, account identity or error text.
    const body=data as {status?:{error_code?:unknown};data?:{plan?:Record<string,unknown>;usage?:Record<string,Record<string,unknown>>}};
    const numberOrNull=(v:unknown)=>v===null?null:typeof v==='number'&&Number.isFinite(v)?v:undefined;
    const account=route==='/v1/key/info'?{
      monthlyLimit:numberOrNull(body.data?.plan?.credit_limit_monthly),dailyLimit:numberOrNull(body.data?.plan?.credit_limit_daily),
      rateLimit:numberOrNull(body.data?.plan?.rate_limit_minute),
      monthUsed:numberOrNull(body.data?.usage?.current_month?.credits_used),monthLeft:numberOrNull(body.data?.usage?.current_month?.credits_left),
      dayUsed:numberOrNull(body.data?.usage?.current_day?.credits_used),dayLeft:numberOrNull(body.data?.usage?.current_day?.credits_left)}:undefined;
    writeFileSync(path.join(this.directory,'cmc-diagnostic.json'),JSON.stringify({at:this.now(),endpoint:route.split('?')[0],httpStatus:response.status,
      errorCode:numberOrNull(body.status?.error_code),credits:creditCount(data),account},null,2));
    if(!response.ok||statusError(data))throw new Error(`CMC HTTP ${response.status}`);
    return data;
  }
  async pollOnce(now=this.now()):Promise<void> {
    if(!this.key||!this.budget||this.polling||this.stopRequested)return;
    try{if(!this.budget.claimPoll(now))return;}catch{this.error='Credit ledger unavailable: API paused';this.stop();return;}
    this.polling=true;
    try {
      if(this.budget.needsInfo(now)) {
        if(!this.budget.reserve(now,true))return;
        const account=parseAccount(await this.request('/v1/key/info'));
        this.budget.updateAccount(now,account.monthUsed,account.monthLeft,account.dayLeft);
      }
      if(this.stopRequested)return;
      if(!this.budget.reserve(now)){this.error='Basic budget reached: API paused';return;}
      const route=`/v3/cryptocurrency/quotes/latest?id=${ARENA_NODES.map(n=>n.id).join(',')}&convert=USD`;
      const raw=await this.request(route),quotes=decodeQuotes(raw,now);
      if(this.fetchedLive&&this.current.sourceTime!==null&&Math.min(...quotes.map(q=>q.sourceTime))<=this.current.sourceTime)return;
      for(const q of quotes){const prices=[...(this.history.get(q.id)??[]),q.price].slice(-12);this.history.set(q.id,prices);}
      this.current=normalizeQuotes(quotes,this.current.version+1,this.history);this.fetchedLive=true;this.error='';this.failureCount=0;
      mkdirSync(this.directory,{recursive:true});
      const cache=path.join(this.directory,'market-cache.json'),tmp=cache+'.tmp';writeFileSync(tmp,JSON.stringify({frame:this.current,history:[...this.history]}));renameSync(tmp,cache);
      // Local-only latest evidence. Request headers and key are deliberately omitted.
      writeFileSync(path.join(this.directory,'cmc-evidence.json'),JSON.stringify({endpoint:'/v3/cryptocurrency/quotes/latest',receivedAt:now,response:raw},null,2));
    }catch {
      this.failureCount++;this.error='CMC unavailable: using fallback state';
      try{this.budget?.backoff(now+Math.min(3600000,300000*2**Math.min(this.failureCount-1,4)));}catch{this.stop();}
    }finally{this.polling=false;if(this.stopRequested){this.budget?.close();this.budget=undefined;}}
  }
}
