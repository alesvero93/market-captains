import { IDLE_ACTION, parseArenaInput } from '@liquidity/shared';
import type { ActionInput } from '@liquidity/shared';
export class ArenaInputQueue {
  private seq=-1;private clientTick=-1;private receivedTick=-100;private windowTick=0;private attempts=0;
  private last:ActionInput={...IDLE_ACTION};private pulse=false;
  ackSeq=-1;rejected=0;
  receive(raw:unknown,tick:number):boolean {
    if(tick-this.windowTick>=30){this.windowTick=tick;this.attempts=0;}
    const input=++this.attempts<=60?parseArenaInput(raw):null;
    if(!input||input.seq<=this.seq||input.clientTick<this.clientTick){this.rejected++;return false;}
    this.seq=input.seq;this.clientTick=input.clientTick;this.receivedTick=tick;
    this.last={moveX:input.moveX,moveY:input.moveY,polarity:input.polarity,boost:input.boost,bank:input.bank,pulse:false};
    this.pulse ||= input.pulse;return true;
  }
  consume(tick:number):ActionInput {
    this.ackSeq=this.seq;
    const action=tick-this.receivedTick>=15?{...IDLE_ACTION}:{...this.last,pulse:this.pulse};
    this.pulse=false;return action;
  }
}
