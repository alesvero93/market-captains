import { FIXED_DT, IDLE_ACTION, TICK_RATE, normalizeMovement } from '@liquidity/shared';
import type { ActionInput, Contestant, Fragment, Gate, GameEvent, MarketFrame, MarketNode, Surge } from '@liquidity/shared';
import { CONFIG } from './config.js';
import { capVector, clamp, validateNodes, resolveContact } from './fields.js';
import { randomStep, step } from './index.js';

export const MATCH = Object.freeze({durationTicks: 18000, closeTicks: 3600, bankTicks: 90,
  maxPlayers: 10, fragmentTarget: 150, fragmentCap: 260, pulseRange: 155, pulseCost: 25,
  pulseCooldown: 90, respawnTicks: 90, protectionTicks: 90});
export const GATES: readonly Gate[] = Object.freeze([
  Object.freeze({id: 1, x: 105, y: 110, radius: 60}),
  Object.freeze({id: 2, x: 1320, y: 785, radius: 60}),
  Object.freeze({id: 3, x: 720, y: 715, radius: 48}),
]);
export const ARENA_NODES: readonly MarketNode[] = validateNodes([
  {id:1,symbol:'BTC',x:720,y:430,radius:56,gravity:3400000,fieldRadius:300,flowStrength:980,momentumN:.7,volatilityN:.22},
  {id:1027,symbol:'ETH',x:305,y:270,radius:43,gravity:1800000,fieldRadius:205,flowStrength:650,momentumN:.42,volatilityN:.25},
  {id:5426,symbol:'SOL',x:1130,y:220,radius:34,gravity:1100000,fieldRadius:180,flowStrength:640,momentumN:-.7,volatilityN:.8},
  {id:1839,symbol:'BNB',x:1070,y:650,radius:35,gravity:1200000,fieldRadius:185,flowStrength:650,momentumN:.3,volatilityN:.2},
  {id:52,symbol:'XRP',x:345,y:650,radius:32,gravity:1050000,fieldRadius:190,flowStrength:600,momentumN:-.45,volatilityN:.4},
  {id:2010,symbol:'ADA',x:595,y:145,radius:25,gravity:650000,fieldRadius:155,flowStrength:490,momentumN:.5,volatilityN:.3},
  {id:74,symbol:'DOGE',x:840,y:740,radius:28,gravity:780000,fieldRadius:150,flowStrength:510,momentumN:-.6,volatilityN:.5},
  {id:5805,symbol:'AVAX',x:1280,y:450,radius:25,gravity:600000,fieldRadius:150,flowStrength:490,momentumN:.55,volatilityN:.4},
  {id:1975,symbol:'LINK',x:155,y:455,radius:27,gravity:650000,fieldRadius:145,flowStrength:480,momentumN:-.3,volatilityN:.28},
  {id:20947,symbol:'SUI',x:885,y:125,radius:24,gravity:600000,fieldRadius:145,flowStrength:460,momentumN:.65,volatilityN:.4},
]);
// A dated verified top-20 fallback for old caches; new CMC frames carry rank.
const VERIFIED_TOP20 = new Set([1,1027,5426,1839,52,2010,74,1975]);
export function selectArenaNodes(input:readonly MarketNode[],seed:number):readonly MarketNode[] {
  const fixed=input.filter(n=>n.id===1||n.id===1027);
  let rng=seed;
  const random=()=>{const r=randomStep(rng);rng=r.state;return r.value;};
  const pool=input.filter(n=>n.id!==1&&n.id!==1027&&VERIFIED_TOP20.has(n.id)&&(n.marketRank===undefined||n.marketRank<=20));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j]!,pool[i]!];}
  const count=3+Math.floor(random()*3);
  // Relative log scaling preserves differences between altcoins without BTC dwarfing them.
  // Old caches use their cap-derived gravity as a proxy until fresh quotes arrive.
  const cap=(n:MarketNode)=>Math.log(Math.max(1,n.marketCap??n.gravity));
  const sizes=pool.map(cap),low=Math.min(...sizes),high=Math.max(...sizes);
  const nodes:MarketNode[]=fixed.map(n=>n.id===1?{...n,x:720,y:450,radius:66,fieldRadius:280}:{...n,x:920,y:450,radius:45,fieldRadius:205});
  for(const n of pool.slice(0,count)){
    const size=high>low?(cap(n)-low)/(high-low):.5;
    const radius=22+size*20,fieldRadius=95+size*90;
    const safe=(x:number,y:number)=>
      Math.hypot(x-720,y-450)>200+45+radius+36&& // clear the entire ETH orbit
      GATES.every(g=>Math.hypot(x-g.x,y-g.y)>g.radius+radius+48)&&
      nodes.every(other=>Math.hypot(x-other.x,y-other.y)>other.radius+radius+76);
    let position:{x:number;y:number}|undefined;
    for(let attempt=0;attempt<500&&!position;attempt++){
      const margin=radius+42,x=margin+random()*(1440-2*margin),y=margin+random()*(900-2*margin);
      if(safe(x,y))position={x,y};
    }
    // Deterministic bounded fallback if random sampling misses a remaining pocket.
    if(!position)for(let y=radius+42;y<858-radius&&!position;y+=32)for(let x=radius+42;x<1398-radius;x+=32){if(safe(x,y)){position={x,y};break;}}
    if(!position)throw new Error('Unable to place market planet safely');
    nodes.push({...n,...position,radius,fieldRadius});
  }
  return validateNodes(nodes);
}
export function orbitNode(n:MarketNode,tick:number):MarketNode {
  if(n.id!==1027)return n;
  const angle=tick/30*Math.PI*2/180;
  return {...n,x:720+Math.cos(angle)*200,y:450+Math.sin(angle)*175};
}
export interface MatchMetrics { pickups:number; banks:number; interruptedBanks:number; pulses:number; eliminations:number; respawns:number; boostTicks:number }
export interface MatchState {
  hackerWindows:readonly {start:number;end:number}[];
  tick:number; seed:number; rngState:number; nextFragmentId:number; players:Contestant[];
  nodes:readonly MarketNode[]; baseNodes:readonly MarketNode[]; fragments:Fragment[];
  gates:readonly Gate[]; events:GameEvent[]; surge:Surge|null; surgeCandidateTicks:number; nextSurgeTick:number;
  durationTicks:number; closeTicks:number; closeRadius:number; phase:'playing'|'closing'|'finished';
  market:MarketFrame; metrics:MatchMetrics; bountyClaims:Record<string,number>;
}
export function syntheticMarket(): MarketFrame {
  return {version:1,mode:'SYNTHETIC',sourceTime:null,nodes:ARENA_NODES,
    fragmentWeights:Object.fromEntries(ARENA_NODES.map(n=>[n.id,1])),message:'Synthetic scenario · no API calls'};
}
// Two seeded encounters, never overlapping or extending into market close.
export function hackerSchedule(seed:number,durationTicks:number):readonly {start:number;end:number}[] {
  const available=durationTicks-Math.min(MATCH.closeTicks,Math.floor(durationTicks/5));
  if(available<6000)return [];
  const a=randomStep(seed^0xa51c9e37),b=randomStep(a.state);
  const first=600+Math.floor(a.value*(available-5100)/2);
  const second=first+2100+Math.floor(b.value*(available-first-4800));
  return [{start:first,end:first+1800},{start:second,end:second+1800}];
}
export function createMatch(seed:number, market=syntheticMarket(), durationTicks:number=MATCH.durationTicks):MatchState {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isSafeInteger(durationTicks)||durationTicks<120) throw new Error('Invalid match configuration');
  const nodes=selectArenaNodes(market.nodes,seed);
  const state:MatchState={hackerWindows:hackerSchedule(seed,durationTicks),tick:0,seed,rngState:seed,nextFragmentId:1,players:[],nodes,baseNodes:nodes,fragments:[],gates:GATES,
    events:[],surge:null,surgeCandidateTicks:0,nextSurgeTick:600,durationTicks,closeTicks:Math.min(MATCH.closeTicks,Math.floor(durationTicks/5)),
    closeRadius:1000,phase:'playing',market:{...market,nodes},metrics:{pickups:0,banks:0,interruptedBanks:0,pulses:0,eliminations:0,respawns:0,boostTicks:0},bountyClaims:{}};
  refill(state,MATCH.fragmentTarget);
  return state;
}
function random(state:MatchState):number {const r=randomStep(state.rngState);state.rngState=r.state;return r.value;}
function spawnPosition(state:MatchState):{x:number;y:number} {
  const gate=state.gates[Math.floor(random(state)*state.gates.length)]!;
  const angle=random(state)*Math.PI*2;
  return {x:clamp(gate.x+Math.cos(angle)*35,25,1415),y:clamp(gate.y+Math.sin(angle)*35,25,875)};
}
export function addPlayer(state:MatchState,id:string,name:string,bot=false,avatar=0):MatchState {
  if(state.players.length>=MATCH.maxPlayers||state.players.some(p=>p.id===id)||state.phase==='finished') return state;
  const next={...state,players:[...state.players]};
  const p:Contestant={id,name,avatar,bot,connected:true,...spawnPosition(next),vx:0,vy:0,polarity:0,energy:100,integrity:100,cargo:0,banked:0,bountyScore:0,eventScore:0,
    bankTicks:0,lastBankTick:0,pulseReadyTick:0,respawnTick:0,protectedUntil:state.tick+MATCH.protectionTicks,bankBlockedUntil:0,lastAttacker:'',lastAttackTick:0,whale:false};
  next.players.push(p);next.players.sort((a,b)=>a.id<b.id?-1:1);return next;
}
export function removePlayer(state:MatchState,id:string):MatchState {return {...state,players:state.players.filter(p=>p.id!==id)};}
export function setConnected(state:MatchState,id:string,connected:boolean):MatchState {
  return {...state,players:state.players.map(p=>p.id===id?{...p,connected,bankTicks:0,vx:0,vy:0}:p)};
}
export function totalScore(p:Contestant):number{return p.banked+p.bountyScore+p.eventScore;}
export function leaderboard(players:readonly Contestant[]):Contestant[] {
  return [...players].sort((a,b)=>totalScore(b)-totalScore(a)||b.banked-a.banked||b.bountyScore-a.bountyScore||a.lastBankTick-b.lastBankTick||(a.id<b.id?-1:1));
}
export function playerMass(p:Contestant):number{return 100+Math.min(600,p.cargo*1.5);}
export function playerRadius(p:Contestant):number{return p.hacker?23:14+Math.min(16,Math.sqrt(p.banked)/2)+Math.min(4,p.cargo/80);}

function walletSafe(state:MatchState,p:{x:number;y:number}):boolean {
  return state.gates.some(g=>Math.hypot(p.x-g.x,p.y-g.y)<g.radius+38);
}
function updateHacker(state:MatchState) {
  const active=state.phase!=='finished'&&state.hackerWindows.some(w=>state.tick>=w.start&&state.tick<w.end);
  const chosen=active?state.players.find(p=>p.bot):undefined;
  for(const p of state.players){
    const was=p.hacker===true;p.hacker=p===chosen;
    if(was!==p.hacker){
      Object.assign(p,p.hacker?{x:720,y:100}:spawnPosition(state),{vx:0,vy:0,bankTicks:0,respawnTick:0,integrity:100,protectedUntil:state.tick+90});
    }
  }
  if(!chosen)return;
  const target=state.players.filter(p=>p!==chosen&&p.connected&&!p.respawnTick&&p.cargo>0&&!walletSafe(state,p))
    .sort((a,b)=>Math.hypot(a.x-chosen.x,a.y-chosen.y)-Math.hypot(b.x-chosen.x,b.y-chosen.y)||(a.id<b.id?-1:a.id>b.id?1:0))[0];
  const aim=target??{x:720+Math.cos(state.tick/900)*350,y:450+Math.sin(state.tick/900)*250};
  const d=Math.hypot(aim.x-chosen.x,aim.y-chosen.y),speed=Math.min(58,d/FIXED_DT);
  chosen.vx=d?((aim.x-chosen.x)/d)*speed:0;chosen.vy=d?((aim.y-chosen.y)/d)*speed:0;
  chosen.x+=chosen.vx*FIXED_DT;chosen.y+=chosen.vy*FIXED_DT;
  constrainHacker(state,chosen);
}
function constrainHacker(state:MatchState,chosen:Contestant) {
  resolveContact(chosen,state.nodes,23);
  for(const g of state.gates){const dx=chosen.x-g.x,dy=chosen.y-g.y,dist=Math.hypot(dx,dy),safe=g.radius+48;
    if(dist<safe){chosen.x=g.x+(dist?dx/dist:1)*safe;chosen.y=g.y+(dist?dy/dist:0)*safe;}}
  chosen.x=clamp(chosen.x,23,1417);chosen.y=clamp(chosen.y,23,877);
}

// Client prediction calls only this motion function. Economy/contacts remain server-only.
export function predictMotion(p:Contestant,nodes:readonly MarketNode[],action:ActionInput,seed:number,tick:number):Contestant {
  if(p.respawnTick>tick||!p.connected)return {...p};
  const input=normalizeMovement(action.moveX,action.moveY);
  const boosted=action.boost&&p.energy>=24*FIXED_DT&&Math.hypot(input.moveX,input.moveY)>.05;
  const motion=step({tick,seed,rngState:seed,player:p,nodes},{...input,polarity:action.polarity,
    thrustScale:Math.pow(100/playerMass(p),.35)*(boosted?2.25:1),arcade:true}).player;
  const radius=playerRadius(p);resolveContact(motion,nodes,radius);
  motion.x=clamp(motion.x,radius,CONFIG.width-radius);motion.y=clamp(motion.y,radius,CONFIG.height-radius);
  return {...p,...motion,energy:clamp(p.energy+(boosted?-24:6)*FIXED_DT,0,100)};
}
function addFragment(state:MatchState,x:number,y:number,value:number,event=false,vx=0,vy=0) {
  if(state.fragments.length<MATCH.fragmentCap&&value>0)state.fragments.push({id:state.nextFragmentId++,x,y,value,event,vx,vy});
}
function refill(state:MatchState,target:number) {
  const nodes=state.nodes.filter(n=>n.gravity>0);
  if(!nodes.length)return;
  const weights=nodes.map(n=>clamp(state.market.fragmentWeights[String(n.id)]??1,.25,3));
  const weightSum=weights.reduce((a,b)=>a+b,0);
  for(let tries=0;state.fragments.length<Math.min(target,MATCH.fragmentCap)&&tries<target*10;tries++) {
    let pick=random(state)*weightSum,index=0;while(index<weights.length-1&&pick>weights[index]!){pick-=weights[index]!;index++;}
    const n=nodes[index]!,angle=random(state)*Math.PI*2;
    const radius=n.radius+35+random(state)*Math.max(20,n.fieldRadius-n.radius-45);
    const x=n.x+Math.cos(angle)*radius,y=n.y+Math.sin(angle)*radius;
    if(x<24||x>1416||y<24||y>876||state.nodes.some(other=>Math.hypot(x-other.x,y-other.y)<other.radius+22))continue;
    if(state.phase==='closing'&&Math.hypot(x-720,y-450)>state.closeRadius-20)continue;
    const event=state.surge?.stage==='active'&&state.surge.nodeId===n.id;
    addFragment(state,x,y,event?8:5,event);
  }
}
function emit(state:MatchState,type:GameEvent['type'],p:Contestant,amount=0) {state.events.push({type,tick:state.tick,x:p.x,y:p.y,playerId:p.id,amount});}
function eliminate(state:MatchState,p:Contestant) {
  const drop=Math.floor(p.cargo*.7),count=Math.min(12,Math.ceil(drop/5));
  let left=drop;
  for(let i=0;i<count;i++){const angle=random(state)*Math.PI*2;const value=Math.ceil(left/(count-i));left-=value;addFragment(state,p.x,p.y,value,false,Math.cos(angle)*90,Math.sin(angle)*90);}
  if(p.whale&&p.lastAttacker&&state.tick-p.lastAttackTick<90) {
    const attacker=state.players.find(a=>a.id===p.lastAttacker&&a.id!==p.id);
    const pair=`${p.lastAttacker}|${p.id}`,last=state.bountyClaims[pair]??-100000;
    if(attacker&&state.tick-last>=1800){attacker.bountyScore+=Math.min(50,Math.floor(p.banked/100)*5);state.bountyClaims[pair]=state.tick;}
  }
  emit(state,'elimination',p,drop);state.metrics.eliminations++;
  p.cargo=0;p.integrity=0;p.bankTicks=0;p.respawnTick=state.tick+MATCH.respawnTicks;p.vx=0;p.vy=0;p.whale=false;
}
function updateDrama(state:MatchState) {
  const closeStart=state.durationTicks-state.closeTicks;
  state.phase=state.tick>=state.durationTicks?'finished':state.tick>=closeStart?'closing':'playing';
  const closing=clamp((state.tick-closeStart)/state.closeTicks,0,1);
  state.closeRadius=1000-closing*680;
  const eventsAllowed=state.market.mode==='LIVE'||state.market.mode==='SYNTHETIC';
  if(state.surge) {
    const age=state.tick-state.surge.startTick;
    if(age>=630){state.surge=null;state.nextSurgeTick=state.tick+900;}
    else state.surge={...state.surge,stage:age<90?'telegraph':age<540?'active':'decay'};
  }
  if(!state.surge&&state.tick>=state.nextSurgeTick&&eventsAllowed&&state.phase==='playing') {
    const candidate=[...state.baseNodes].sort((a,b)=>b.volatilityN-a.volatilityN||a.id-b.id).find(n=>n.volatilityN>=.6);
    state.surgeCandidateTicks=candidate?state.surgeCandidateTicks+1:0;
    if(candidate&&state.surgeCandidateTicks>=60){state.surge={nodeId:candidate.id,startTick:state.tick,stage:'telegraph'};state.surgeCandidateTicks=0;}
  } else if(!eventsAllowed)state.surgeCandidateTicks=0;
  const ranked=[...state.baseNodes].sort((a,b)=>b.gravity-a.gravity||a.id-b.id);
  const activeCount=state.phase==='closing'?Math.max(3,Math.ceil(ranked.length*(1-closing*.7))):ranked.length;
  const active=new Set(ranked.slice(0,activeCount).map(n=>n.id));
  state.nodes=state.baseNodes.map(n=>{
    const rank=ranked.findIndex(r=>r.id===n.id);
    const shutdownAt=(ranked.length-rank)/Math.max(1,ranked.length-3);
    const fade=state.phase==='closing'?clamp((shutdownAt-closing)/.08,0,1):1;
    const keep=rank<3?1:active.has(n.id)?fade:0;
    const surge=state.surge?.nodeId===n.id&&state.surge.stage==='active'?1.6:1;
    return {...orbitNode(n,state.tick),gravity:n.gravity*keep,flowStrength:n.flowStrength*keep,volatilityN:Math.min(1,n.volatilityN*surge)*keep};
  });
}
export function applyMarket(state:MatchState,market:MarketFrame):MatchState {
  if(market.version<state.market.version)return state;
  const validated=validateNodes(market.nodes);
  const nextNodes=state.baseNodes.map(n=>{
    const target=validated.find(t=>t.id===n.id);if(!target)return n;
    // Pin geometry for the match; smooth only force parameters at 1 Hz boundaries.
    const approach=(a:number,b:number,limit:number)=>a+clamp((b-a)*.2,-limit,limit);
    const stale=market.mode==='STALE'?.5:market.mode==='DEGRADED'?.15:1;
    return {...n,...(target.volumeN===undefined?{}:{volumeN:target.volumeN}),gravity:approach(n.gravity,target.gravity,80000),flowStrength:approach(n.flowStrength,target.flowStrength*stale,25),
      momentumN:approach(n.momentumN,target.momentumN,.04),volatilityN:approach(n.volatilityN,target.volatilityN*stale,.025)};
  });
  return {...state,baseNodes:nextNodes,market:{...market,nodes:nextNodes}};
}

export function stepMatch(state:MatchState,actions:Readonly<Record<string,ActionInput>>):MatchState {
  if(state.phase==='finished')return state;
  const next:MatchState={...state,tick:state.tick+1,players:state.players.map(p=>({...p})),fragments:state.fragments.map(f=>({...f})),
    events:state.events.filter(e=>state.tick-e.tick<30),metrics:{...state.metrics},bountyClaims:{...state.bountyClaims}};
  updateDrama(next);
  updateHacker(next);
  if(next.phase==='finished')return next;
  for(const p of next.players) {
    const input=actions[p.id]??IDLE_ACTION;
    if(!p.connected||p.hacker)continue;
    if(p.respawnTick>0) {
      if(next.tick<p.respawnTick)continue;
      Object.assign(p,spawnPosition(next),{vx:0,vy:0,polarity:0,energy:100,integrity:100,respawnTick:0,protectedUntil:next.tick+90,lastAttacker:''});
      emit(next,'respawn',p);next.metrics.respawns++;
    }
    const before={...p};
    const gate=next.gates.find(g=>Math.hypot(p.x-g.x,p.y-g.y)<g.radius);
    const docking=input.bank&&gate&&Math.hypot(input.moveX,input.moveY)<.15&&!input.boost&&!input.pulse&&next.tick>=p.bankBlockedUntil;
    if(docking&&p.bankTicks>0){p.vx=0;p.vy=0;p.energy=Math.min(100,p.energy+6*FIXED_DT);}
    else Object.assign(p,predictMotion(p,next.nodes,input,next.seed,state.tick));
    if(input.boost&&p.energy<before.energy)next.metrics.boostTicks++;
    if(docking){p.vx*=.8;p.vy*=.8;}
    if(next.tick>=p.protectedUntil) {
      for(const n of next.nodes) {
        if(n.gravity<=0)continue;
        const d=Math.hypot(p.x-n.x,p.y-n.y);
        if(d<=n.radius+playerRadius(p)+.001) {
          const nx=(before.x-n.x)/Math.max(1,Math.hypot(before.x-n.x,before.y-n.y)),ny=(before.y-n.y)/Math.max(1,Math.hypot(before.x-n.x,before.y-n.y));
          const impact=-(before.vx*nx+before.vy*ny);
          if(impact>90){p.integrity-=Math.min(35,(impact-90)*.18);p.protectedUntil=next.tick+20;p.bankBlockedUntil=next.tick+30;}
        }
      }
      if(next.phase==='closing'&&Math.hypot(p.x-720,p.y-450)>next.closeRadius){p.integrity-=12*FIXED_DT;p.bankBlockedUntil=next.tick+2;}
    }
    if(p.integrity<=0){eliminate(next,p);continue;}
    p.integrity=Math.min(100,p.integrity+.3*FIXED_DT);
    if(input.pulse&&p.energy>=MATCH.pulseCost&&next.tick>=p.pulseReadyTick) {
      p.energy-=MATCH.pulseCost;p.pulseReadyTick=next.tick+MATCH.pulseCooldown;p.bankBlockedUntil=next.tick+30;
      emit(next,'pulse',p);next.metrics.pulses++;
      const hacker=next.players.find(q=>q.hacker);
      if(hacker){const dx=hacker.x-p.x,dy=hacker.y-p.y,d=Math.hypot(dx,dy);if(d<MATCH.pulseRange&&d>0){hacker.x+=dx/d*65;hacker.y+=dy/d*65;}}
      for(const other of next.players) {
        const d=Math.hypot(other.x-p.x,other.y-p.y);
        if(other.hacker||other.id===p.id||!other.connected||other.respawnTick>0||next.tick<other.protectedUntil||d>MATCH.pulseRange)continue;
        const magnitude=270*(1-d/MATCH.pulseRange)*Math.sqrt(100/playerMass(other));
        const nx=d>1e-8?(other.x-p.x)/d:1,ny=d>1e-8?(other.y-p.y)/d:0;
        const v=capVector({x:other.vx+nx*magnitude,y:other.vy+ny*magnitude},CONFIG.maxSpeed);other.vx=v.x;other.vy=v.y;
        other.bankBlockedUntil=next.tick+30;other.lastAttacker=p.id;other.lastAttackTick=next.tick;
      }
      for(const f of next.fragments){const d=Math.hypot(f.x-p.x,f.y-p.y);if(d<MATCH.pulseRange){f.vx+=(f.x-p.x)/Math.max(d,1)*160;f.vy+=(f.y-p.y)/Math.max(d,1)*160;}}
    }
  }
  // Stable pair order prevents iteration-dependent contact outcomes.
  for(let i=0;i<next.players.length;i++)for(let j=i+1;j<next.players.length;j++) {
    const a=next.players[i]!,b=next.players[j]!;if(a.hacker||b.hacker||a.respawnTick||b.respawnTick||!a.connected||!b.connected)continue;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=playerRadius(a)+playerRadius(b);
    if(d>=min)continue;
    const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,overlap=(min-d)/2;
    a.x=clamp(a.x-nx*overlap,14,1426);a.y=clamp(a.y-ny*overlap,14,886);b.x=clamp(b.x+nx*overlap,14,1426);b.y=clamp(b.y+ny*overlap,14,886);
    // Settled neighbours may share a wallet; meaningful impacts still interrupt deposits.
    if(overlap>1&&Math.hypot(a.vx-b.vx,a.vy-b.vy)>20){a.bankBlockedUntil=next.tick+10;b.bankBlockedUntil=next.tick+10;}
  }
  const remaining:Fragment[]=[];
  for(const f of next.fragments) {
    f.x=clamp(f.x+f.vx*FIXED_DT,20,1420);f.y=clamp(f.y+f.vy*FIXED_DT,20,880);f.vx*=.92;f.vy*=.92;
    for(const n of next.nodes){const dx=f.x-n.x,dy=f.y-n.y,d=Math.hypot(dx,dy);if(d<n.radius+8){f.x=n.x+(d>1e-8?dx/d:1)*(n.radius+8);f.y=n.y+(d>1e-8?dy/d:0)*(n.radius+8);}}
    const winner=next.players.find(p=>!p.hacker&&p.connected&&!p.respawnTick&&p.cargo<1000&&Math.hypot(p.x-f.x,p.y-f.y)<playerRadius(p)+7);
    if(winner){winner.cargo=Math.min(1000,winner.cargo+f.value);if(f.event)winner.eventScore++;next.metrics.pickups++;}
    else remaining.push(f);
  }
  next.fragments=remaining;
  const hacker=next.players.find(p=>p.hacker);
  if(hacker)constrainHacker(next,hacker);
  if(hacker&&next.tick%15===0)for(const p of next.players){
    if(p!==hacker&&p.connected&&!p.respawnTick&&next.tick>=p.protectedUntil&&!walletSafe(next,p)&&Math.hypot(p.x-hacker.x,p.y-hacker.y)<=playerRadius(p)+23+2)p.cargo=Math.max(0,p.cargo-1);
  }
  for(const p of next.players) {
    if(p.hacker||!p.connected||p.respawnTick)continue;
    const input=actions[p.id]??IDLE_ACTION,gate=next.gates.find(g=>Math.hypot(p.x-g.x,p.y-g.y)<g.radius);
    const canBank=input.bank&&gate&&p.cargo>0&&Math.hypot(p.vx,p.vy)<65&&Math.hypot(input.moveX,input.moveY)<.15&&!input.boost&&!input.pulse&&next.tick>=p.bankBlockedUntil;
    if(canBank){p.bankTicks++;if(p.bankTicks>=MATCH.bankTicks){const amount=p.cargo;p.banked+=amount;p.cargo=0;p.bankTicks=0;p.lastBankTick=next.tick;next.metrics.banks++;emit(next,'bank',p,amount);}}
    else{if(p.bankTicks>0)next.metrics.interruptedBanks++;p.bankTicks=0;}
  }
  const leader=leaderboard(next.players)[0];for(const p of next.players)p.whale=!!leader&&p.id===leader.id&&p.banked>=100&&!p.respawnTick;
  if(next.tick%90===0)refill(next,next.surge?.stage==='active'?190:MATCH.fragmentTarget);
  return next;
}
export function botAction(state:MatchState,p:Contestant):ActionInput {
  if(p.hacker||p.respawnTick||!p.connected)return {...IDLE_ACTION};
  const nearest=<T extends {x:number;y:number}>(items:readonly T[]):T|undefined=>{let best:T|undefined,distance=Infinity;for(const item of items){const d=(p.x-item.x)**2+(p.y-item.y)**2;if(d<distance){best=item;distance=d;}}return best;};
  const personality=[...p.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const gates=state.gates.filter(g=>state.phase!=='closing'||Math.hypot(g.x-720,g.y-450)<state.closeRadius-55);
  const gate=gates.find(g=>Math.hypot(g.x-p.x,g.y-p.y)<g.radius)??[...gates].sort((a,b)=>{
    const cost=(g:Gate)=>Math.hypot(g.x-p.x,g.y-p.y)+state.players.filter(q=>q.id!==p.id&&!q.hacker&&q.cargo>0&&Math.hypot(q.x-g.x,q.y-g.y)<g.radius).length*180;
    return cost(a)-cost(b)||a.id-b.id;
  })[0]??state.gates[2]!;
  const banking=p.cargo>=35+(personality%4)*10||p.cargo>0&&(p.bankTicks>0||p.integrity<40||state.phase==='closing');
  let target:{x:number;y:number}=banking?gate:nearest(state.fragments.filter(f=>
    (state.phase!=='closing'||Math.hypot(f.x-720,f.y-450)<state.closeRadius-45)&&
    !state.nodes.some(n=>Math.hypot(f.x-n.x,f.y-n.y)<n.radius+playerRadius(p)+12)))??gate;
  // Spread deposits around a wallet so bots do not continually break each other's channel.
  if(banking){const angle=personality*2.39996;target={x:gate.x+Math.cos(angle)*21,y:gate.y+Math.sin(angle)*21};}
  const distance=Math.hypot(target.x-p.x,target.y-p.y);
  const depositing=banking&&Math.hypot(p.x-gate.x,p.y-gate.y)<gate.radius-10;
  let dx=target.x-p.x,dy=target.y-p.y,blocked=false;
  // Look ahead and take a tangent around solid planet cores, instead of ramming them.
  for(const n of state.nodes){const nx=n.x-p.x,ny=n.y-p.y,d=Math.hypot(nx,ny),safe=n.radius+playerRadius(p)+10;
    const along=(nx*dx+ny*dy)/Math.max(1,distance),cross=(nx*dy-ny*dx)/Math.max(1,distance);
    if(along>0&&along<Math.min(distance,230)&&Math.abs(cross)<safe){const side=cross===0?(personality%2?1:-1):Math.sign(cross);dx=-ny/d*side*180-nx/d*Math.max(0,safe+15-d)*4;dy=nx/d*side*180-ny/d*Math.max(0,safe+15-d)*4;blocked=true;break;}}
  const hacker=state.players.find(q=>q.hacker),danger=hacker?Math.hypot(p.x-hacker.x,p.y-hacker.y):Infinity;
  if(hacker&&danger<125&&!depositing){dx+=(p.x-hacker.x)/Math.max(1,danger)*240;dy+=(p.y-hacker.y)/Math.max(1,danger)*240;}
  const steer=depositing?{moveX:0,moveY:0}:normalizeMovement(dx*2.5-p.vx*1.8,dy*2.5-p.vy*1.8);
  const near=nearest(state.nodes);
  return {...steer,polarity:near?(near.momentumN>=0?1:-1):0,boost:!blocked&&(distance>260||danger<85)&&p.energy>65&&!depositing,bank:depositing,
    pulse:!banking&&p.energy>65&&state.tick>=p.pulseReadyTick&&(danger<75||state.players.some(q=>q.id!==p.id&&!q.hacker&&!q.respawnTick&&q.cargo>p.cargo+25&&!walletSafe(state,q)&&Math.hypot(q.x-p.x,q.y-p.y)<75))};
}
export function matchChecksum(state:MatchState):string {
  let hash=2166136261;const data=JSON.stringify(state);for(let i=0;i<data.length;i++)hash=Math.imul(hash^data.charCodeAt(i),16777619);return(hash>>>0).toString(16).padStart(8,'0');
}

