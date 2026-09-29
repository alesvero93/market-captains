import { Room, ServerError } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import { ARENA_SCHEMA_VERSION, playerIdentity } from '@liquidity/shared';
import type { ActionInput, ArenaSnapshot, MarketFrame, LobbySnapshot } from '@liquidity/shared';
import { addPlayer, applyMarket, botAction, createMatch, matchChecksum, removePlayer, setConnected, stepMatch, syntheticMarket } from '@liquidity/sim';
import { ArenaInputQueue } from './arena-input.js';
import { ReplayWriter } from './replay.js';
import { randomInt } from 'node:crypto';
export interface MarketSource { frame(now?:number):MarketFrame; stats?():{requests:number;monthly:number;daily:number;blocked:boolean} }
interface Options {lobbyWaitMs?:number;market?:MarketSource;botCount?:number;replayDirectory?:string;durationTicks?:number}
export class ArenaRoom extends Room {
  override maxClients=10;
  private match=createMatch(20260923);
  private gates=new Map<string,ArenaInputQueue>();
  private market:MarketSource={frame:syntheticMarket};
  private replay=new ReplayWriter(undefined,'');
  private rejected=0;
  private desiredBots=4;
  private waiting=false;
  private waitMs=0;
  private deadline=0;
  private lastLobby=0;
  private hostId='';
  private lobbyState():LobbySnapshot {
    const players=this.match.players.filter(p=>!p.bot);
    if(!players.some(p=>p.id===this.hostId&&p.connected))this.hostId=players.find(p=>p.connected)?.id??'';
    return {roomId:this.roomId,hostId:this.hostId,remainingMs:Math.max(0,this.deadline-Date.now()),capacity:10,
      players:players.map(({id,name,avatar,connected})=>({id,name,avatar,connected}))};
  }
  private publishLobby(){this.broadcast('lobby',this.lobbyState());}
  private begin(){
    if(!this.waiting)return;
    this.waiting=false;void this.lock();this.balanceBots();
    for(const client of this.clients)client.send('arena',this.snapshot(client.sessionId));
  }
  private balanceBots(){
    if(this.waiting||this.match.phase==='finished')return;
    const target=Math.min(this.desiredBots,10-this.match.players.filter(p=>!p.bot).length);
    const bots=this.match.players.filter(p=>p.bot);
    for(const bot of bots.slice(target)){this.match=removePlayer(this.match,bot.id);this.replay.write({type:"leave",id:bot.id});}
    for(let i=1;this.match.players.filter(p=>p.bot).length<target;i++){const id=`bot-${i}`,name=`BOT ${i}`;if(this.match.players.some(p=>p.id===id))continue;this.match=addPlayer(this.match,id,name,true,i%10);this.replay.write({type:"join",id,name,bot:true,avatar:i%10});}
  }
  override onCreate(options:Options):void {
    this.waitMs=Math.max(0,Math.min(180000,options.lobbyWaitMs??0));this.waiting=this.waitMs>0;
    this.market=options.market??this.market;
    const market=this.market.frame();
    this.match=createMatch(randomInt(0x100000000),market,options.durationTicks);
    this.replay=new ReplayWriter(options.replayDirectory,this.roomId);
    this.replay.write({type:'start',seed:this.match.seed,market,durationTicks:this.match.durationTicks});
    this.desiredBots=this.waitMs?10:Math.max(0,Math.min(4,Math.floor(options.botCount??4)));this.balanceBots();
    this.onMessage('start',(client:Client)=>{if(this.waiting&&client.sessionId===this.lobbyState().hostId)this.begin();});
    this.onMessage('input',(client:Client,value:unknown)=>{if(this.waiting)return;if(!this.gates.get(client.sessionId)?.receive(value,this.match.tick))this.rejected++;});
    this.setSimulationInterval(()=>{
      if(this.waiting){
        if(!this.deadline)return;
        if(Date.now()>=this.deadline||this.clients.length>=10)this.begin();
        else {if(Date.now()-this.lastLobby>=1000){this.lastLobby=Date.now();this.publishLobby();}return;}
      }
      if(this.match.phase==='finished')return;
      if(this.match.tick%30===0){const frame=this.market.frame();this.match=applyMarket(this.match,frame);this.replay.write({type:'market',market:frame});}
      const actions:Record<string,ActionInput>={};
      for(const p of this.match.players)actions[p.id]=p.bot?botAction(this.match,p):this.gates.get(p.id)?.consume(this.match.tick)??{moveX:0,moveY:0,polarity:0,boost:false,pulse:false,bank:false};
      this.match=stepMatch(this.match,actions);this.replay.write({type:'tick',actions});
      if(this.match.tick%300===0)this.replay.write({type:'checksum',checksum:matchChecksum(this.match)});
      if(this.match.tick%3===0)for(const client of this.clients)client.send('arena',this.snapshot(client.sessionId));
      if(this.match.phase==='finished'){void this.lock();this.replay.write({type:'checksum',checksum:matchChecksum(this.match)});this.clock.setTimeout(()=>void this.disconnect(),120000);}
    },1000/30);
  }
  override onJoin(client:Client,options:unknown):void {
    if(this.waitMs&&!this.waiting)throw new ServerError(409,'This match has started. Find another public lobby.');
    if(this.match.phase==='finished')throw new ServerError(409,'Match finished: join a new arena.');
    const {name,avatar}=playerIdentity(options);
    if(this.match.players.length>=10){const bot=this.match.players.find(p=>p.bot);if(bot){this.match=removePlayer(this.match,bot.id);this.replay.write({type:'leave',id:bot.id});}}
    this.match=addPlayer(this.match,client.sessionId,name,false,avatar);this.gates.set(client.sessionId,new ArenaInputQueue());
    this.replay.write({type:'join',id:client.sessionId,name,bot:false,avatar});this.balanceBots();if(this.waiting){if(!this.deadline)this.deadline=Date.now()+this.waitMs;this.publishLobby();}else client.send('arena',this.snapshot(client.sessionId));
  }
  override async onDrop(client:Client):Promise<void> {
    this.match=setConnected(this.match,client.sessionId,false);this.replay.write({type:'connected',id:client.sessionId,connected:false});if(this.waiting)this.publishLobby();
    try{await this.allowReconnection(client,15);}catch{/* onLeave performs final removal */}
  }
  override onReconnect(client:Client):void {
    this.match=setConnected(this.match,client.sessionId,true);this.gates.set(client.sessionId,new ArenaInputQueue());
    this.replay.write({type:'connected',id:client.sessionId,connected:true});if(this.waiting)this.publishLobby();else client.send('arena',this.snapshot(client.sessionId));
  }
  override onLeave(client:Client):void {
    this.match=removePlayer(this.match,client.sessionId);this.gates.delete(client.sessionId);this.replay.write({type:'leave',id:client.sessionId});if(this.match.phase!=='finished')this.balanceBots();if(this.waiting)this.publishLobby();
  }
  override onDispose():void {this.replay.write({type:'checksum',checksum:matchChecksum(this.match)});this.replay.close();
    console.log(JSON.stringify({event:'match_summary',ticks:this.match.tick,metrics:this.match.metrics,rejectedInputs:this.rejected,replayFailed:this.replay.failed}));}
  private snapshot(id:string):ArenaSnapshot {
    const m=this.match;
    return {schemaVersion:ARENA_SCHEMA_VERSION,matchId:this.roomId,selfId:id,seed:m.seed,tick:m.tick,ackSeq:this.gates.get(id)?.ackSeq??-1,
      players:m.players,nodes:m.nodes,fragments:m.fragments,gates:m.gates,events:m.events,remainingTicks:Math.max(0,m.durationTicks-m.tick),
      globalPolarity:m.globalPolarity,airdrop:m.tick>=m.airdrop.start&&m.tick<m.airdrop.end?m.airdrop:undefined,phase:m.phase,closeRadius:m.closeRadius,surge:m.surge,marketVersion:m.market.version,marketMode:m.market.mode,
      marketSourceTime:m.market.sourceTime,marketMessage:m.market.message};
  }
}
