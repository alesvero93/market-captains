import type { ArenaInput, ArenaSnapshot, Contestant } from '@liquidity/shared';
import { predictMotion } from './match.js';

/** Bounded speculative motion; scores, pickups and health always come from the server. */
export class MotionPredictor {
  player:Contestant|undefined;
  private snapshot:ArenaSnapshot|undefined;
  private pending:ArenaInput[]=[];
  private lastSequence=-1;
  get pendingCount(){return this.pending.length;}
  reset(){this.player=undefined;this.snapshot=undefined;this.pending=[];this.lastSequence=-1;}
  accept(snapshot:ArenaSnapshot):boolean {
    if(this.snapshot&&snapshot.matchId===this.snapshot.matchId&&snapshot.tick<=this.snapshot.tick)return false;
    if(this.snapshot&&snapshot.matchId!==this.snapshot.matchId)this.reset();
    this.snapshot=snapshot;this.pending=this.pending.filter(i=>i.seq>snapshot.ackSeq);
    const authoritative=snapshot.players.find(p=>p.id===snapshot.selfId);
    this.player=authoritative?{...authoritative}:undefined;
    if(snapshot.phase==='finished'){this.pending=[];return true;}
    for(let i=0;i<this.pending.length;i++)this.advance(this.pending[i]!,snapshot.tick+i);
    return true;
  }
  push(input:ArenaInput):boolean {
    if(!this.snapshot||this.snapshot.phase==='finished'||input.seq<=this.lastSequence)return false;
    this.lastSequence=input.seq;
    // Stop speculation after 3 seconds without acknowledgement; never grow an unbounded queue.
    if(this.pending.length>=90)return false;
    this.pending.push(input);this.advance(input,this.snapshot.tick+this.pending.length-1);return true;
  }
  private advance(input:ArenaInput,tick:number){
    if(!this.player||!this.snapshot||this.player.respawnTick||!this.player.connected)return;
    if(this.player.bankTicks>0&&input.bank)return;
    this.player=predictMotion(this.player,this.snapshot.nodes,input,this.snapshot.seed,tick);
  }
}
