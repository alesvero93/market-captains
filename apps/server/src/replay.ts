import { createWriteStream, mkdirSync } from 'node:fs';
import type { WriteStream } from 'node:fs';
import path from 'node:path';
import type { ActionInput, MarketFrame } from '@liquidity/shared';
import { addPlayer, applyMarket, createMatch, matchChecksum, removePlayer, setConnected, stepMatch } from '@liquidity/sim';
export type ReplayRecord =
 | {type:'start';seed:number;market:MarketFrame;durationTicks:number}
 | {type:'join';id:string;name:string;bot:boolean;avatar?:number}
 | {type:'leave';id:string}
 | {type:'connected';id:string;connected:boolean}
 | {type:'market';market:MarketFrame}
 | {type:'tick';actions:Record<string,ActionInput>}
 | {type:'checksum';checksum:string};
export class ReplayWriter {
  private stream:WriteStream|undefined;
  failed=false;
  constructor(directory:string|undefined,matchId:string) {
    if(!directory)return;
    mkdirSync(directory,{recursive:true});
    this.stream=createWriteStream(path.join(directory,`${matchId.replace(/[^a-zA-Z0-9_-]/g,'')}.ndjson`),{flags:'wx'});
    this.stream.on('error',()=>{this.failed=true;});
  }
  write(record:ReplayRecord) {
    if(!this.stream||this.failed)return;
    if(this.stream.writableLength>1024*1024){this.failed=true;this.stream.end();return;}
    this.stream.write(JSON.stringify(record)+'\n');
  }
  close(){this.stream?.end();}
}
export function replayMatch(records:readonly ReplayRecord[]) {
  const start=records[0];if(start?.type!=='start')throw new Error('Replay header missing');
  let state=createMatch(start.seed,start.market,start.durationTicks);
  for(const r of records.slice(1))switch(r.type){
    case'join':state=addPlayer(state,r.id,r.name,r.bot,r.avatar??0);break;
    case'leave':state=removePlayer(state,r.id);break;
    case'connected':state=setConnected(state,r.id,r.connected);break;
    case'market':state=applyMarket(state,r.market);break;
    case'tick':state=stepMatch(state,r.actions);break;
    case'checksum':if(matchChecksum(state)!==r.checksum)throw new Error('Replay checksum mismatch');break;
    case'start':throw new Error('Duplicate replay header');
  }
  return state;
}
