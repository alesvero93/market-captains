import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export const BASIC_BUDGET=Object.freeze({month:10000,day:320,intervalMs:300000,infoIntervalMs:3600000});
interface Ledger {version:1;keyHash:string;month:string;day:string;monthly:number;daily:number;nextPoll:number;infoAt:number;
  accountMonthLeft:number;accountDayLeft:number;blocked:boolean;requests:number}
const period=(now:number)=>({month:new Date(now).toISOString().slice(0,7),day:new Date(now).toISOString().slice(0,10)});
export class CreditBudget {
  private file:string;private lock:string;private owned=false;private state:Ledger;
  constructor(directory:string,keyHash:string,now:number) {
    mkdirSync(directory,{recursive:true});this.file=path.join(directory,'cmc-budget.json');this.lock=path.join(directory,'cmc-owner.lock');
    if(existsSync(this.lock)) {
      const pid=Number(readFileSync(this.lock,'utf8'));
      if(!Number.isSafeInteger(pid)||pid<=0)throw new Error('Invalid CMC ownership lock');
      try{process.kill(pid,0);throw new Error('CMC collector already owns this data directory');}
      catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw error;unlinkSync(this.lock);}
    }
    const lockFd=openSync(this.lock,'wx');writeFileSync(lockFd,String(process.pid));closeSync(lockFd);this.owned=true;
    try {
      if(existsSync(this.file)) {
        const v=JSON.parse(readFileSync(this.file,'utf8')) as Ledger;
        if(v.version!==1||v.keyHash!==keyHash||typeof v.month!=='string'||typeof v.day!=='string'||typeof v.blocked!=='boolean'||
          ['monthly','daily','nextPoll','infoAt','accountMonthLeft','accountDayLeft','requests'].some(k=>!Number.isFinite(v[k as keyof Ledger])||Number(v[k as keyof Ledger])<0))throw new Error('Invalid CMC ledger; polling blocked');
        this.state=v;
      } else {this.state={version:1,keyHash,...period(now),monthly:0,daily:0,nextPoll:0,infoAt:0,accountMonthLeft:0,accountDayLeft:0,blocked:false,requests:0};this.save();}
    } catch(error){this.close();throw error;}
  }
  private save(){const tmp=this.file+'.tmp';const fd=openSync(tmp,'w');try{writeFileSync(fd,JSON.stringify(this.state));fsyncSync(fd);}finally{closeSync(fd);}renameSync(tmp,this.file);}
  private rollover(now:number){const p=period(now);if(p.day<this.state.day){this.state.blocked=true;this.save();return;}if(p.month>this.state.month){this.state.month=p.month;this.state.monthly=0;this.state.infoAt=0;}if(p.day>this.state.day){this.state.day=p.day;this.state.daily=0;this.state.infoAt=0;}}
  claimPoll(now:number):boolean {
    this.rollover(now);
    if(this.state.blocked||now<this.state.nextPoll||this.state.monthly>=BASIC_BUDGET.month||this.state.daily>=BASIC_BUDGET.day)return false;
    this.state.nextPoll=now+BASIC_BUDGET.intervalMs;this.save();return true;
  }
  needsInfo(now:number):boolean{return this.state.infoAt===0||now-this.state.infoAt>=BASIC_BUDGET.infoIntervalMs;}
  reserve(now:number,usageProbe=false):boolean {
    this.rollover(now);
    if(this.state.blocked||this.state.monthly+1>BASIC_BUDGET.month||this.state.daily+1>BASIC_BUDGET.day)return false;
    if(!usageProbe&&(this.needsInfo(now)||this.state.accountMonthLeft<2||this.state.accountDayLeft<2))return false;
    this.state.monthly++;this.state.daily++;this.state.requests++;
    if(!usageProbe){this.state.accountMonthLeft--;this.state.accountDayLeft--;}
    this.save();return true;
  }
  reconcile(credits:number|undefined) {
    // Unknown outcomes retain the reservation. Unexpected cost disables all further calls.
    if(credits===undefined)return;
    if(!Number.isSafeInteger(credits)||credits<0){this.state.blocked=true;this.save();return;}
    const extra=credits-1;
    this.state.monthly+=extra;this.state.daily+=extra;
    if(extra>0){this.state.blocked=true;this.state.accountMonthLeft=Math.max(0,this.state.accountMonthLeft-extra);this.state.accountDayLeft=Math.max(0,this.state.accountDayLeft-extra);}
    this.save();
  }
  updateAccount(now:number,monthUsed:number,monthLeft:number,dayLeft:number) {
    if([monthUsed,monthLeft,dayLeft].some(n=>!Number.isFinite(n)||n<0))throw new Error('Invalid account quota');
    this.state.accountMonthLeft=Math.max(0,Math.min(monthLeft,BASIC_BUDGET.month-monthUsed));
    this.state.accountDayLeft=dayLeft;this.state.infoAt=now;this.save();
  }
  backoff(until:number){this.state.nextPoll=Math.max(this.state.nextPoll,until);this.save();}
  suspend(){this.state.blocked=true;this.save();}
  stats(){return {monthly:this.state.monthly,daily:this.state.daily,requests:this.state.requests,blocked:this.state.blocked,nextPoll:this.state.nextPoll};}
  close(){if(this.owned){unlinkSync(this.lock);this.owned=false;}}
}
