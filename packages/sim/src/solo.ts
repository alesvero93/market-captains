import { ARENA_SCHEMA_VERSION, type ActionInput, type ArenaSnapshot, type MarketFrame } from '@liquidity/shared';
import { addPlayer, applyMarket, botAction, createMatch, stepMatch, syntheticMarket } from './match.js';

/** One local authority: no network prediction or server corrections. */
export class SoloArena {
  private state;
  constructor(seed:number,name:string,avatar:number,market:MarketFrame=syntheticMarket(),difficulty:1|2|3=2,botCount:3|4|5=3){
    this.state=addPlayer(createMatch(seed,market),'solo',name,false,avatar);
    this.state.difficulty=difficulty;
    if(![3,4,5].includes(botCount))throw new Error('Choose 3, 4 or 5 bots');
    for(let i=1;i<=botCount;i++)this.state=addPlayer(this.state,`bot-${i}`,`BOT ${i}`,true,i);
  }
  market(frame:MarketFrame){this.state=applyMarket(this.state,frame);}
  step(input:ActionInput){
    const actions:Record<string,ActionInput>={solo:input};
    for(const p of this.state.players)if(p.bot)actions[p.id]=botAction(this.state,p);
    this.state=stepMatch(this.state,actions);
    return this.snapshot();
  }
  snapshot():ArenaSnapshot {
    const m=this.state;
    return {schemaVersion:ARENA_SCHEMA_VERSION,matchId:`solo-${m.seed}`,selfId:'solo',seed:m.seed,tick:m.tick,ackSeq:m.tick,
      players:m.players,nodes:m.nodes,fragments:m.fragments,gates:m.gates,events:m.events,remainingTicks:Math.max(0,m.durationTicks-m.tick),
      globalPolarity:m.globalPolarity,airdrop:m.tick>=m.airdrop.start&&m.tick<m.airdrop.end?m.airdrop:undefined,phase:m.phase,closeRadius:m.closeRadius,surge:m.surge,marketVersion:m.market.version,marketMode:m.market.mode,
      marketSourceTime:m.market.sourceTime,marketMessage:m.market.message};
  }
}
