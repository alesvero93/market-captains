import type {ArenaSnapshot,Polarity} from '@liquidity/shared';
/** Gameplay guidance only: no trade recommendations, invented prices or additional API calls. */
export function opportunity(s:ArenaSnapshot,polarity:Polarity):string {
  const self=s.players.find(p=>p.id===s.selfId);
  if(s.phase==='finished')return 'MARKET CLOSED · Final ranking uses banked wallet points. Start a new match to play again.';
  if(s.phase==='closing')return 'MARKET CLOSE · Move toward a wallet inside the closing zone and stay inside the shrinking circle.';
  const hacker=s.players.find(p=>p.hacker);
  if(self&&hacker&&Math.hypot(self.x-hacker.x,self.y-hacker.y)<150)return 'HACKER NEARBY · Pulse, boost or reach a wallet shield. Your banked points stay safe.';
  if(self&&self.cargo>=40)return `Secure ${self.cargo} cargo · Stop inside a green wallet for 3 seconds.`;
  if(s.marketMode==='STALE'||s.marketMode==='DEGRADED')return 'Market feed delayed · Follow the attenuated fields. Fresh market opportunities are paused.';
  const node=[...s.nodes].filter(n=>n.gravity>0).sort((a,b)=>{
    const count=(n:typeof a)=>s.fragments.filter(f=>Math.hypot(f.x-n.x,f.y-n.y)<n.fieldRadius).length;
    return count(b)-count(a)||a.id-b.id;
  })[0];
  if(!node)return 'Explore the arena and collect glowing fragments.';
  const count=s.fragments.filter(f=>Math.hypot(f.x-node.x,f.y-node.y)<node.fieldRadius).length;
  const flow=node.id===1?(polarity===1?'clockwise sling':'counterclockwise sling'):Math.abs(node.momentumN)<.02?'almost no current':`${polarity===1?'LONG':'SHORT'} current ${node.momentumN*polarity>0?'outward':'inward'}`;
  return `${s.marketMode==='SYNTHETIC'?'SYNTHETIC · ':''}${node.symbol} · ${count} nearby fragments · ${flow}${node.volatilityN>.6?' · high turbulence':''}. ${node.id===1?'Solar heat drains health; the core destroys your ship.':'Gravity still pulls inward.'}`;
}
