import type { MarketFrame } from '@liquidity/shared';
import { ARENA_NODES } from '@liquidity/sim';
export interface RawQuote {id:number;price:number;marketCap:number;volume:number;change1h:number;sourceTime:number;marketRank?:number}
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid API object');return v as Record<string,unknown>;};
const finite=(v:unknown,min=-Infinity)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min)throw new Error('Invalid market number');return v;};
export function decodeQuotes(value:unknown,now:number):RawQuote[] {
  const root=Array.isArray(value)?value:object(value).data;
  const rows=Array.isArray(root)?root:root&&typeof root==='object'?Object.values(root):null;
  if(!rows||rows.length!==ARENA_NODES.length)throw new Error('Expected all ten market nodes');
  const seen=new Set<number>();
  const result=rows.map(raw=>{
    const row=object(raw),id=finite(row.id,1);if(seen.has(id)||!ARENA_NODES.some(n=>n.id===id))throw new Error('Unexpected market ID');seen.add(id);
    const quote=Array.isArray(row.quote)?row.quote.map(object).find(q=>q.symbol==='USD'||q.id===2781):object(row.quote).USD;
    const q=object(quote),sourceTime=typeof q.last_updated==='string'?Date.parse(q.last_updated):NaN;
    if(!Number.isFinite(sourceTime)||sourceTime>now+60000||sourceTime<now-86400000)throw new Error('Invalid source timestamp');
    return {id,...(Number.isSafeInteger(row.cmc_rank)&&Number(row.cmc_rank)>0?{marketRank:Number(row.cmc_rank)}:{}),price:finite(q.price,Number.MIN_VALUE),marketCap:finite(q.market_cap,Number.MIN_VALUE),volume:finite(q.volume_24h,0),change1h:finite(q.percent_change_1h),sourceTime};
  });
  return result.sort((a,b)=>a.id-b.id);
}
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const median=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return s.length%2?s[Math.floor(s.length/2)]!:(s[s.length/2-1]!+s[s.length/2]!)/2;};
const robust=(v:number,values:number[])=>{const m=median(values),mad=median(values.map(x=>Math.abs(x-m)));return clamp((v-m)/Math.max(.1,1.4826*mad),-3,3)/3;};
export function normalizeQuotes(quotes:readonly RawQuote[],version:number,history:ReadonlyMap<number,readonly number[]>):MarketFrame {
  const caps=quotes.map(q=>Math.log10(q.marketCap)),volumes=quotes.map(q=>Math.log10(Math.max(q.volume,1))),changes=quotes.map(q=>Math.abs(q.change1h));
  const scale=Math.max(.1,median(changes)+1.4826*median(changes.map(c=>Math.abs(c-median(changes)))));
  const weights:Record<string,number>={};
  const nodes=ARENA_NODES.map(n=>{
    const q=quotes.find(q=>q.id===n.id);if(!q)throw new Error('Missing quote');
    const cap=(robust(Math.log10(q.marketCap),caps)+1)/2,volume=(robust(Math.log10(Math.max(q.volume,1)),volumes)+1)/2;
    const prices=history.get(n.id)??[];let volatility=0;
    if(prices.length>=4){const returns=prices.slice(1).map((p,i)=>Math.log(p/prices[i]!));const mean=returns.reduce((a,b)=>a+b,0)/returns.length;volatility=clamp(Math.sqrt(returns.reduce((s,r)=>s+(r-mean)**2,0)/returns.length)/.006,0,1);}
    weights[String(n.id)]=.5+volume*2;
    return {...n,marketCap:q.marketCap,...(q.marketRank?{marketRank:q.marketRank}:{}),volumeN:volume,radius:24+cap*36,gravity:600000+cap*3400000,flowStrength:450+cap*550,
      momentumN:clamp(q.change1h/scale,-1,1),volatilityN:volatility};
  });
  return {version,mode:'LIVE',sourceTime:Math.min(...quotes.map(q=>q.sourceTime)),nodes,fragmentWeights:weights,
    message:quotes.every(q=>(history.get(q.id)?.length??0)>=4)?'CoinMarketCap · shared update every 5 minutes':'CoinMarketCap · volatility warming up'};
}
export function parseAccount(value:unknown) {
  const data=object(object(value).data),usage=object(data.usage),month=object(usage.current_month),day=object(usage.current_day);
  let dayLeft:number;
  if(day.credits_left===undefined){
    // Live Basic reports daily usage but omits a daily remaining allowance.
    // Apply our own daily cap, minus ALL account usage; never infer unlimited credit.
    const plan=object(data.plan);finite(plan.credit_limit_monthly,1);finite(plan.rate_limit_minute,1);
    const dailyLimit=plan.credit_limit_daily===undefined?320:Math.min(320,finite(plan.credit_limit_daily,0));
    dayLeft=Math.max(0,dailyLimit-finite(day.credits_used,0));
  }else dayLeft=Math.min(finite(day.credits_left,0),Math.max(0,320-(day.credits_used===undefined?0:finite(day.credits_used,0))));
  return {monthUsed:finite(month.credits_used,0),monthLeft:finite(month.credits_left,0),dayLeft};
}
export function creditCount(value:unknown):number|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  const status=(value as Record<string,unknown>).status;
  if(!status||typeof status!=='object')return undefined;
  const count=(status as Record<string,unknown>).credit_count;
  return typeof count==='number'?count:undefined;
}
export function statusError(value:unknown):boolean {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const status=(value as Record<string,unknown>).status;
  return !!status&&typeof status==='object'&&Number((status as Record<string,unknown>).error_code??0)!==0;
}
