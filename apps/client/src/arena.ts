import musicUrl from './assets/turbateknichal.mp3?url';
import {showLoading,hideLoading} from './loading.js';
import brandLogo from './assets/market-captains-logo.png?inline';
import Phaser from 'phaser';

import { ARENA_SCHEMA_VERSION, ARENA_ROOM_NAME, normalizeMovement, AVATARS, type ArenaInput, type ArenaSnapshot, type Contestant, type MarketFrame, type Polarity } from '@liquidity/shared';
import { leaderboard, totalScore, SoloArena, syntheticMarket, playerRadius, MATCH, MEMECOINS, CLOSE_CENTER, mouseSteering } from '@liquidity/sim';
import './arena.css';
import { PORTRAITS } from './portraits.js';
import { opportunity } from '@liquidity/sim';
import { installGuide, guideOpen } from './guide.js';
const coinUrls=import.meta.glob('./assets/coins/*.svg',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header><a class="logo" href="/" aria-label="Market Captains home"><img class="brand-logo" src="${brandLogo}" alt="MARKET CAPTAINS" width="240" height="60" /></a><a href="https://coinmarketcap.com/" target="_blank" rel="noopener">Data by CoinMarketCap ↗</a></header>
<main><div class="headline"><div><p class="overline">SINGLE PLAYER / LOCAL SIMULATION</p><h1>Collect. Grow. Protect your wallet.</h1></div><div class="clock" id="clock">05:00</div></div>
<div class="market"><span id="network" role="status">Choose your captain</span><span id="market">SYNTHETIC</span><span id="population"></span></div>
<section class="layout"><div class="play"><div id="arena" aria-label="Arena: WASD or arrows, hold left mouse to steer, right mouse boosts; whale Q toggles LONG SHORT, Shift boosts, Space pulses. Stand still in a wallet to deposit." tabindex="0"></div><div id="notice" role="status">Collect glowing fragments. Stop inside a green wallet for 3 seconds to deposit automatically.</div></div>
<aside><p class="overline">YOUR CAPTAIN</p><div class="scores"><div><span>CARGO · AT RISK</span><strong id="cargo">0</strong></div><div><span>IN YOUR WALLET</span><strong id="banked">0</strong></div></div><label>Fuel <meter id="energy" min="0" max="100" value="100"></meter></label><label>Health <meter id="hp" min="0" max="85" value="85"></meter></label><label>Deposit <progress id="bank" max="90" value="0"></progress></label><p class="overline">LEADERBOARD</p><ol id="leaders"></ol><button id="again" hidden>New match</button><p class="hint">A fuller wallet makes a rounder captain. Cargo weighs you down and is lost on elimination. Banked points stay yours.</p></aside></section>
<section class="controls" aria-label="Controls"><div class="polarities"><button data-polarity="1" aria-pressed="true">△ LONG</button><button data-polarity="-1">▽ SHORT</button></div><button id="boost">BOOST <kbd>Shift</kbd></button><button id="pulse">PULSE <kbd>Space</kbd></button><button id="invite">SHARE GAME</button><button id="sound" aria-pressed="false">Music off</button></section>
<div class="touch"><div id="stick" aria-label="Joystick touch"><span>✥</span></div><span>Drag to move · tap LONG or SHORT</span></div><footer><span>HOLD LEFT MOUSE · RIGHT BOOST · WHALE: Q</span><span id="data-note">Synthetic data: no CMC calls.</span><span>SINGLE PLAYER · 3 BOTS</span></footer></main>`;
document.querySelector('.controls')!.insertAdjacentHTML('afterend',`<a id="invite-link" hidden></a><p id="flow-status" class="flow-status" role="status">Only the whale controls LONG / SHORT for everyone.</p><details class="explain"><summary>How the market changes the map</summary><p>Market cap sets planet size and gravity; Bitcoin is a tangential sling. volume distributes fragments; one-hour momentum directs the current. Volatility comes from prices sampled every five minutes, after warm-up.</p><label for="inspect-node">Inspect a node</label><select id="inspect-node" aria-label="Node to inspect"></select><p id="inspect-values"></p><p>The biggest wallet controls the shared current: LONG is outward at rising planets, SHORT reverses it. Bitcoin has only clockwise / counterclockwise current, solar heat and a lethal core. Other planets retain gravity inside their halos. Release movement for automatic braking. These are game indices, not percentage changes, bets or forecasts. SYNTHETIC values are illustrative scenarios.</p></details>`);
document.querySelector('main')!.insertAdjacentHTML('beforebegin',`<section id="start-screen" class="start-screen"><div class="start-copy"><p class="overline">A SMALL UNIVERSE. A VERY BIG WALLET.</p><h1>The market moves.<br>Can you ride it?</h1><p>Dodge the Bitcoin sun, ride the currents and fill your wallet.<br>Five-minute solo matches. Three bots. Smooth local simulation.</p><ul><li><b>Move</b> by holding left mouse or with WASD / arrows</li><li><b>Whale Q</b> controls LONG / SHORT · <b>Space</b> pushes rivals away</li><li><b>Right mouse / Shift</b> boosts · stop in wallets to deposit</li></ul><p class="hint">Market data powers the map. No real money. No crypto wallet connection.</p></div><form id="start-form" class="pilot-card"><p class="overline">CHOOSE YOUR MEME CREW</p><div id="avatars" class="avatars">${AVATARS.map((name,i)=>`<button type="button" data-avatar="${i}" aria-label="${name}" aria-pressed="${i===0}"><img src="${PORTRAITS[i]}" alt=""/><span>${name}</span></button>`).join('')}</div><label for="pilot-name">Name or invented ticker</label><input id="pilot-name" maxlength="16" placeholder="MOONBEAN" autocomplete="off" value="MOONBEAN"/><label for="difficulty">Bot difficulty: <output id="difficulty-label">Challenging</output></label><input id="difficulty" type="range" min="1" max="3" step="1" value="2" aria-label="Bot difficulty"/><button id="play" type="submit" class="play-button">ENTER THE ARENA →</button><button id="fresh-room" type="button" hidden>FIND ANOTHER ARENA</button><p id="start-status" role="status">Choose a captain: all avatars have the same abilities.</p></form></section>`);
document.querySelector('.play')!.insertAdjacentHTML('beforeend',`<section id="opportunities" aria-label="Gameplay opportunities"><p class="overline">OPPORTUNITIES <span> / GAMEPLAY</span></p><p id="opportunity-text">Join an arena to read the currents.</p><small id="market-update">Market cap → planet size / gravity · volume → fragments · momentum → current · volatility → turbulence</small></section>`);
document.querySelector('aside')!.insertAdjacentHTML('beforeend','<p class="music-credit">Original soundtrack by the MARKET CAPTAINS team.<br>Free to use · Mr Finn — Turbateknichal</p>');
document.querySelector('.market')!.prepend(document.querySelector('.clock')!);
const leftRail=document.createElement('nav');leftRail.className='left-rail';leftRail.setAttribute('aria-label','Game controls and opportunities');
document.querySelector('.layout')!.prepend(leftRail);
for(const selector of ['.controls','#flow-status','#notice','#opportunities','.touch','.explain'])leftRail.append(document.querySelector(selector)!);
document.querySelector<HTMLElement>('main')!.hidden=true;
let avatar=0;
document.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach(b=>b.onclick=()=>{avatar=Number(b.dataset.avatar);document.querySelectorAll('[data-avatar]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));el<HTMLInputElement>('pilot-name').value=AVATARS[avatar]!;});
const el = <T extends HTMLElement = HTMLElement>(id:string)=>document.getElementById(id)! as T;
el<HTMLFormElement>('start-form').onsubmit=e=>{e.preventDefault();void connect();};
el<HTMLInputElement>('difficulty').oninput=()=>{el('difficulty-label').textContent=['Relaxed','Challenging','Ruthless'][Number(el<HTMLInputElement>('difficulty').value)-1]!;};
el('play').onclick=e=>{e.preventDefault();void connect();};
let game:Phaser.Game|undefined;

el("fresh-room").onclick=()=>{history.replaceState(null,"",location.pathname);void connect();};
let solo:SoloArena|undefined, latest:ArenaSnapshot|undefined, previous:ArenaSnapshot|undefined;
let cachedMarket:MarketFrame=syntheticMarket(); let accumulator=0; let lastHud=0;
let predicted:Contestant|undefined, seq=0, clientTick=0, receivedAt=0;
let connected=false, polarity:Polarity=1, pulse=false, audioEnabled=false;
let lastEventTick=-1;
let musicPending=false;
const music=new Audio(musicUrl);music.loop=false;music.preload='none';music.volume=.35;
function musicStatus(){el('sound').textContent=music.ended?'Music finished':music.paused?'Music off':'Music on';el('sound').setAttribute('aria-pressed',String(!music.paused));}
music.onended=musicStatus;music.onpause=musicStatus;music.onplay=musicStatus;
function startMusic(){music.pause();music.currentTime=0;void music.play().then(musicStatus).catch(()=>{musicStatus();});}

const keys=new Set<string>(); const held=new Set<string>(); let joystick={moveX:0,moveY:0};
function select(value:Polarity){if(connected&&!latest?.players.find(p=>p.id===latest?.selfId)?.whale)return;polarity=value;document.querySelectorAll<HTMLButtonElement>('[data-polarity]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.polarity)===value)));}
document.querySelectorAll<HTMLButtonElement>('[data-polarity]').forEach(b=>b.onclick=()=>select(Number(b.dataset.polarity) as Polarity));
const controlKeys=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' ','q'];
let mouseTarget:{x:number;y:number}|undefined,mouseHeld=false,mouseBoost=false;
const arenaElement=el('arena');
function pointMouse(e:PointerEvent){
 const canvas=arenaElement.querySelector('canvas');if(!canvas)return;
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
 mouseTarget={x:Math.max(0,Math.min(1440,(e.clientX-r.left)*1440/r.width)),y:Math.max(0,Math.min(900,(e.clientY-r.top)*900/r.height))};
 mouseHeld=(e.buttons&1)!==0;mouseBoost=(e.buttons&2)!==0;
}
arenaElement.oncontextmenu=e=>e.preventDefault();
arenaElement.onpointerdown=e=>{arenaElement.focus({preventScroll:true});if(e.pointerType!=='mouse')return;e.preventDefault();arenaElement.setPointerCapture(e.pointerId);pointMouse(e);};
arenaElement.onpointermove=e=>{if(e.pointerType==='mouse')pointMouse(e);};
arenaElement.onpointerup=e=>{if(e.pointerType==='mouse')pointMouse(e);};
arenaElement.onpointercancel=()=>{mouseHeld=mouseBoost=false;mouseTarget=undefined;};
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(guideOpen()||!connected||!controlKeys.includes(k)||(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement))return;e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)pulse=true;if(k==='q'&&!e.repeat)select(polarity===1?-1:1);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function release(){mouseHeld=mouseBoost=false;mouseTarget=undefined;keys.clear();held.clear();pulse=false;joystick={moveX:0,moveY:0};}
document.querySelector('.controls')!.insertAdjacentHTML('beforeend','<button data-guide>GUIDE</button>');
document.querySelector('.start-copy')!.insertAdjacentHTML('beforeend','<button data-guide>HOW TO PLAY →</button>');
installGuide(release);
window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
for(const id of ['boost','pulse']){const b=el(id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(id);if(id==='pulse')pulse=true;};b.onpointerup=b.onpointercancel=()=>held.delete(id);}
const stick=el('stick');let stickPointer:number|null=null;
function moveStick(e:PointerEvent){if(e.pointerId!==stickPointer)return;const r=stick.getBoundingClientRect();joystick=normalizeMovement((e.clientX-r.left-r.width/2)/35,(e.clientY-r.top-r.height/2)/35);}
stick.onpointerdown=e=>{stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);};stick.onpointermove=moveStick;stick.onpointerup=stick.onpointercancel=()=>{stickPointer=null;joystick={moveX:0,moveY:0};};
el('sound').onclick=()=>{if(music.ended)return;if(music.paused)void music.play().then(musicStatus).catch(musicStatus);else music.pause();};
function tone(_hz:number){}
function status(message:string){el('network').textContent=message;el('start-status').textContent=message;}
async function refreshMarket(){
  try{
    const response=await fetch('/api/market',{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Market unavailable');
    const frame=await response.json() as MarketFrame;
    if(!frame||!Array.isArray(frame.nodes)||!frame.nodes.length)throw Error('Invalid market');
    // Validate through the pure simulation before applying external data.
    const check=new SoloArena(1,'check',0,frame);check.snapshot();
    cachedMarket=frame;solo?.market(frame);
  }catch{
    if(cachedMarket.sourceTime!==null){cachedMarket={...cachedMarket,mode:'STALE',message:'Market connection delayed · local play continues'};solo?.market(cachedMarket);}
  }
}
void refreshMarket();setInterval(()=>void refreshMarket(),60000);
async function connect(){
  release();music.pause();musicPending=true;accumulator=0;seq=clientTick=0;lastEventTick=-1;lastHud=0;
  const seed=crypto.getRandomValues(new Uint32Array(1))[0]!;
  solo=new SoloArena(seed,el<HTMLInputElement>('pilot-name').value.slice(0,16)||'CAPTAIN',avatar,cachedMarket,Number(el<HTMLInputElement>('difficulty').value) as 1|2|3);
  latest=solo.snapshot();previous=undefined;predicted=latest.players.find(p=>p.id==='solo');
  el('start-screen').hidden=true;document.querySelector<HTMLElement>('main')!.hidden=false;
  if(!game){showLoading(0,'Preparing captains and planets…');game=createGame();}game.scale.refresh();el('arena').focus();connected=true;
  status('● Single player · local');updateHud(latest);
}
el('again').onclick=()=>{release();music.pause();connected=false;document.querySelector<HTMLElement>('main')!.hidden=true;el('start-screen').hidden=false;};
el('invite').onclick=async()=>{
  const url=location.origin;const link=el<HTMLAnchorElement>('invite-link');link.href=url;link.textContent=`Single-player game: ${url}`;link.hidden=false;
  try{await navigator.clipboard.writeText(url);}catch{/* Visible link remains available. */}
  el('notice').textContent='Share this game: each player has their own solo arena.';
};
function localTick(){
  if(!connected||!solo||!latest||latest.phase==='finished'){if(latest?.phase==='finished')music.pause();return;}
  const down=(...ks:string[])=>ks.some(k=>keys.has(k))?1:0;
  let movement=normalizeMovement(down('d','arrowright')-down('a','arrowleft')+joystick.moveX,down('s','arrowdown')-down('w','arrowup')+joystick.moveY);
  const self=latest.players.find(p=>p.id===latest?.selfId);
  if(mouseHeld&&mouseTarget&&self&&Math.hypot(movement.moveX,movement.moveY)<.05)movement=mouseSteering(self,mouseTarget);
  const input:ArenaInput={schemaVersion:ARENA_SCHEMA_VERSION,seq:seq++,clientTick:clientTick++,polarity,...movement,boost:mouseBoost||keys.has('shift')||held.has('boost'),pulse,bank:Math.hypot(movement.moveX,movement.moveY)<.15};pulse=false;
  previous=latest;latest=solo.step(input);predicted=latest.players.find(p=>p.id==='solo');
  if(latest.tick-lastHud>=6||latest.phase==='finished'){updateHud(latest);lastHud=latest.tick;}
  for(const event of latest.events)if(event.tick>lastEventTick&&event.playerId==='solo')tone(event.type==='bank'?660:event.type==='elimination'?110:330);lastEventTick=latest.tick;
}
function updateInspector(s:ArenaSnapshot){const select=el<HTMLSelectElement>('inspect-node');const roster=s.nodes.map(n=>n.id).join(',');if(select.dataset.roster!==roster){select.replaceChildren();select.dataset.roster=roster;for(const n of s.nodes){const o=document.createElement('option');o.value=String(n.id);o.textContent=n.symbol;select.append(o);}}const n=s.nodes.find(n=>String(n.id)===select.value);if(n)el('inspect-values').textContent=`${n.symbol} · momentum ${n.momentumN.toFixed(2)} / ±1 · turbulence ${n.volatilityN.toFixed(2)} / 1 · gravity ${(n.gravity/1000000).toFixed(2)} M · ${s.marketMode}`;}
el('inspect-node').onchange=()=>{if(latest)updateInspector(latest);};
let updateMessage='Market cap → gravity · volume → fragments · momentum → current · volatility → turbulence';
function updateHud(s:ArenaSnapshot){updateInspector(s);
  const globalPolarity=s.globalPolarity??1;
  const whale=s.players.find(p=>p.whale),ownWhale=whale?.id===s.selfId;
  if(!ownWhale)polarity=globalPolarity;
  document.querySelectorAll<HTMLButtonElement>('[data-polarity]').forEach(b=>{b.disabled=!ownWhale;b.setAttribute('aria-pressed',String(Number(b.dataset.polarity)===globalPolarity));b.title=ownWhale?'Whale controls the shared current':'Bank the biggest wallet to control the current';});
  el('opportunity-text').textContent=s.airdrop?`AIRDROP · Follow ${s.airdrop.name}: 15-point fragments for ${Math.ceil((s.airdrop.end-s.tick)/30)} more seconds.`:opportunity(s,globalPolarity);
  if(previous?.marketSourceTime&&s.marketSourceTime&&s.marketSourceTime!==previous.marketSourceTime){
    const changes=s.nodes.map(n=>({n,delta:n.momentumN-(previous!.nodes.find(old=>old.id===n.id)?.momentumN??n.momentumN)})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
    const change=changes[0];updateMessage=change&&Math.abs(change.delta)>.005?`CMC update · ${change.n.symbol} current shifted ${change.delta>0?'upward':'downward'} · fields adjust gradually`:'CMC update received · currents remain broadly stable';
  }
  el('market-update').textContent=updateMessage;const self=s.players.find(p=>p.id===s.selfId),seconds=Math.ceil(s.remainingTicks/30);el('clock').textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
  el('market').textContent=s.marketMode;el('data-note').textContent=s.marketMessage+(s.marketSourceTime?` · source ${new Date(s.marketSourceTime).toLocaleTimeString('en-US')}`:'');
  el('population').dataset.hacker=String(s.players.some(p=>p.hacker));el('population').textContent=`Single player · ${s.players.filter(p=>p.bot&&!p.hacker).length} bots${s.players.some(p=>p.hacker)?' · HACKER':''}`;
  if(self){const node=[...s.nodes].sort((a,b)=>Math.hypot(self.x-a.x,self.y-a.y)-Math.hypot(self.x-b.x,self.y-b.y))[0];if(node){const active=Math.hypot(self.x-node.x,self.y-node.y)<node.fieldRadius;el('flow-status').textContent=`${globalPolarity===1?'LONG':'SHORT'} · ${node.symbol} ${node.momentumN>=0?'↑':'↓'} · ${active?(node.id===1?(globalPolarity===1?'CLOCKWISE SLING ↻':'COUNTERCLOCKWISE SLING ↺'):Math.abs(node.momentumN)<.02?'almost no current':globalPolarity*node.momentumN>0?'OUTWARD CURRENT →':'INWARD CURRENT ←'):'enter the halo to feel the current'} · ${ownWhale?'YOU ARE THE WHALE · Q to reverse':whale?`${whale.name} controls the current`:'Bank points to become whale'}`;}el('cargo').textContent=String(self.cargo);el('banked').textContent=String(self.banked);el<HTMLMeterElement>('energy').value=self.energy;el<HTMLMeterElement>('hp').value=self.integrity;el<HTMLProgressElement>('bank').value=self.bankTicks;
    el('notice').textContent=self.respawnTick?`Respawning in ${Math.max(0,Math.ceil((self.respawnTick-s.tick)/30))} s · wallet safe`:s.phase==='finished'?`Match over · wallet ${self.banked}`:s.phase==='closing'?'MARKET CLOSE · storm damage rising! Reach the safe circle':self.bankTicks?`Depositing · ${(self.bankTicks/30).toFixed(1)} / 3 s`:s.surge?`VOLATILITY SURGE · ${s.nodes.find(n=>n.id===s.surge!.nodeId)?.symbol} · ${s.surge.stage==='telegraph'?'incoming':s.surge.stage==='active'?'active':'fading'}`:'Collect fragments. Stop in green wallets for 3 seconds to deposit automatically.';
  }
  el('leaders').replaceChildren(...leaderboard(s.players.filter(p=>!p.hacker)).slice(0,8).map(p=>{const li=document.createElement('li');li.className=p.id===s.selfId?'self':'';li.textContent=`${p.whale?'WHALE · ':''}${p.id===s.selfId?'YOU':p.name}${p.bot?' · BOT':''}   ${p.banked}`;return li;}));
  el<HTMLButtonElement>('again').hidden=s.phase!=='finished';
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
class ArenaScene extends Phaser.Scene {
  private g!:Phaser.GameObjects.Graphics;private sprites=new Map<string,Phaser.GameObjects.Image>();private labels=new Map<string,Phaser.GameObjects.Text>();
  preload(){this.load.on('progress',(value:number)=>showLoading(Math.round(value*100),'Loading captains and planets…'));for(const [path,url] of Object.entries(coinUrls)){const symbol=path.split('/').pop()!.replace('.svg','').toUpperCase();this.load.image(`coin-${symbol}`,'data:image/svg+xml;base64,'+btoa(url));}PORTRAITS.forEach((url,i)=>this.load.image(`avatar-${i}`,url));}
  create(){this.g=this.add.graphics();hideLoading();}
  sprite(id:string,texture:string,x:number,y:number,size:number){let item=this.sprites.get(id);if(!item){item=this.add.image(x,y,texture);this.sprites.set(id,item);}item.setTexture(texture).setPosition(x,y).setDisplaySize(size,size).setVisible(true);}

  label(id:string,text:string,x:number,y:number,color='#8ea3b6',size=13){let l=this.labels.get(id);if(!l){l=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color}).setOrigin(.5);this.labels.set(id,l);}l.setText(text).setPosition(x,y).setColor(color).setVisible(true);}
  override update(_time:number,delta:number){
    if(document.hidden||guideOpen()||!document.hasFocus()){release();accumulator=0;if(connected)status('Paused · click the arena to resume');}
    else if(connected){if(musicPending){musicPending=false;startMusic();}status('● Single player · local');accumulator+=Math.min(delta,100);let steps=0;while(accumulator>=1000/30&&steps++<3){localTick();accumulator-=1000/30;}}
    const g=this.g;if(!g)return;g.clear();for(const item of this.sprites.values())item.setVisible(false);for(const l of this.labels.values())l.setVisible(false);g.fillStyle(0x080f1b).fillRect(0,0,1440,900);g.lineStyle(1,0x193040,.5);for(let x=0;x<1440;x+=60)g.lineBetween(x,0,x,900);for(let y=0;y<900;y+=60)g.lineBetween(0,y,1440,y);
    const s=latest;if(!s){this.label('loading','CHOOSE YOUR CAPTAIN',720,450,'#72efd0',22);return;}
    const renderFrom=previous??s, renderTo=s; const alpha=Math.min(1,accumulator/(1000/30));
    for(const target of renderTo.nodes){const old=renderFrom.nodes.find(n=>n.id===target.id);const n=old?{...target,x:old.x+(target.x-old.x)*alpha,y:old.y+(target.y-old.y)*alpha}:target;const c=n.id===1?0xffb74e:n.momentumN>=0?0x4bb9a1:0xc980ed;g.fillStyle(c,n.gravity>0?.035:.01).fillCircle(n.x,n.y,n.fieldRadius);g.lineStyle(1,c,n.gravity>0?.2:.06).strokeCircle(n.x,n.y,n.fieldRadius);g.lineStyle(2,c,.65).strokeCircle(n.x,n.y,n.radius+5);g.fillStyle(0x101e2b).fillCircle(n.x,n.y,n.radius);
      // Quiet volume pulses and irregular volatility halos expose the data mapping.
      if(n.volumeN!==undefined&&n.gravity>0){const phase=reduced?.5:(s.tick/90+n.id%7/7)%1;g.lineStyle(1,0x70dccd,(1-phase)*(.08+n.volumeN*.25)).strokeCircle(n.x,n.y,n.radius+10+phase*26);}
      if(n.volatilityN>.03&&n.gravity>0){g.lineStyle(1,0xf0bd80,.12+n.volatilityN*.4);g.beginPath();for(let j=0;j<=48;j++){const a=j/48*Math.PI*2,wiggle=Math.sin(a*7+(reduced?0:s.tick/40))*n.volatilityN*10,rad=n.fieldRadius+wiggle,x=n.x+Math.cos(a)*rad,y=n.y+Math.sin(a)*rad;if(j===0)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();}
      if(n.id===1){for(let ring=3;ring>0;ring--)g.fillStyle(0xffb74e,.035).fillCircle(n.x,n.y,n.radius+ring*14);g.lineStyle(1,0xffd280,.15).strokeEllipse(720,450,400,350);}
      if(this.textures.exists(`coin-${n.symbol}`))this.sprite(`coin-${n.id}`,`coin-${n.symbol}`,n.x,n.y,n.radius*1.7);
      this.label(`n${n.id}`,n.symbol,n.x,n.y-n.radius-17,n.id===1?'#ffcc79':'#d4e6ee',14);this.label(`m${n.id}`,`${n.momentumN>=0?'↑':'↓'} ${Math.abs(n.momentumN).toFixed(2)}`,n.x,n.y+n.radius+20,'#829cae',11);
      if(n.id===1){const direction=s.globalPolarity??1;for(let i=0;i<8;i++){const a=i*Math.PI/4+(reduced?0:s.tick/70*direction),r=n.radius+65,x=n.x+Math.cos(a)*r,y=n.y+Math.sin(a)*r,dx=-Math.sin(a)*direction,dy=Math.cos(a)*direction;g.lineStyle(3,0xffca70,.75).lineBetween(x-dx*12,y-dy*12,x+dx*12,y+dy*12);g.lineBetween(x+dx*12,y+dy*12,x+dx*5-dy*5,y+dy*5+dx*5);}this.label('solar-warning','SOLAR HEAT · CORE = DEATH',n.x,n.y-n.radius-45,'#ffb96a',12);}
      if(n.id!==1&&Math.abs(n.momentumN)>.02&&n.flowStrength>0)for(let i=0;i<8;i++){
        const a=i*Math.PI/4,d=(s.globalPolarity??1)*n.momentumN>=0?1:-1,phase=reduced?.5:((s.tick/75+i/8)%1),r=n.radius+28+(d>0?phase:1-phase)*(n.fieldRadius-n.radius-42);
        const x=n.x+Math.cos(a)*r,y=n.y+Math.sin(a)*r,dx=Math.cos(a)*d,dy=Math.sin(a)*d,flowColor=d>0?0x78efd0:0xd8a0ff;
        g.lineStyle(1,flowColor,.07+Math.abs(n.momentumN)*.18).lineBetween(x-dx*30,y-dy*30,x,y);
        g.fillStyle(flowColor,.4).fillCircle(x-dx*20,y-dy*20,1.5);
        g.lineStyle(2,flowColor,.25+Math.min(.5,Math.abs(n.momentumN))).lineBetween(x-dx*10,y-dy*10,x+dx*8,y+dy*8);
        g.lineBetween(x+dx*8,y+dy*8,x+dx*2-dy*5,y+dy*2+dx*5);g.lineBetween(x+dx*8,y+dy*8,x+dx*2+dy*5,y+dy*2-dx*5);
      }
    }
    for(const gate of s.gates){g.lineStyle(2,0x78efd0,.8).strokeRoundedRect(gate.x-42,gate.y-42,84,84,12);g.lineStyle(1,0x78efd0,.2).strokeCircle(gate.x,gate.y,gate.radius);this.label(`g${gate.id}`,'WALLET',gate.x,gate.y,'#78efd0',12);}
    for(const f of s.fragments){
 if(f.diamond){g.fillStyle(0x9ce9ff,.95).fillTriangle(f.x,f.y-8,f.x+6,f.y,f.x,f.y+8).fillTriangle(f.x,f.y-8,f.x-6,f.y,f.x,f.y+8);g.lineStyle(1,0xffffff,.8).lineBetween(f.x-6,f.y,f.x+6,f.y);}
 else g.fillStyle(f.event?0xf3c675:0x74dfd3,.85).fillCircle(f.x,f.y,f.event?5:3);
}
    if(s.airdrop){const d=s.airdrop;g.fillStyle(0xee84dd).fillCircle(d.x,d.y,22);g.lineStyle(3,0xffe9aa).strokeCircle(d.x,d.y,26);this.sprite('airdrop-coin',`avatar-${Math.max(0,MEMECOINS.indexOf(d.name as typeof MEMECOINS[number]))}`,d.x,d.y,42);this.label('airdrop-label',d.name+' · AIRDROP',d.x,d.y-40,'#ffd58a',15);}
    if(mouseHeld&&mouseTarget)g.lineStyle(1,0x78efd0,.5).strokeCircle(mouseTarget.x,mouseTarget.y,12);

    for(const authoritative of renderTo.players){const old=renderFrom.players.find(p=>p.id===authoritative.id);let p={...authoritative,x:old&&!old.respawnTick&&Math.hypot(authoritative.x-old.x,authoritative.y-old.y)<150?old.x+(authoritative.x-old.x)*alpha:authoritative.x,y:old&&!old.respawnTick&&Math.hypot(authoritative.x-old.x,authoritative.y-old.y)<150?old.y+(authoritative.y-old.y)*alpha:authoritative.y};if(authoritative.respawnTick)continue;
      if(p.hacker){
        g.fillStyle(0xff334c,.10).fillCircle(p.x,p.y,40);g.lineStyle(2,0xff435a,.85).strokeCircle(p.x,p.y,29);
        g.fillStyle(0x691829).fillTriangle(p.x,p.y-26,p.x-24,p.y+22,p.x+24,p.y+22);
        g.fillStyle(0x160e1c).fillEllipse(p.x,p.y+1,31,29);g.lineStyle(3,0xff4d62).lineBetween(p.x-9,p.y-2,p.x-3,p.y+1).lineBetween(p.x+3,p.y+1,p.x+9,p.y-2);
        this.label(`p${p.id}`,'HACKER',p.x,p.y-42,'#ff6576',13);
        for(const victim of s.players){if(victim.id!==p.id&&!victim.respawnTick&&victim.cargo>0&&s.tick>=victim.protectedUntil&&!s.gates.some(gate=>Math.hypot(victim.x-gate.x,victim.y-gate.y)<gate.radius+38)&&Math.hypot(victim.x-p.x,victim.y-p.y)<=playerRadius(victim)+25){
          g.lineStyle(3,0xff435a,.8).lineBetween(p.x,p.y,victim.x,victim.y);this.label(`drain-${victim.id}`,'−2 CARGO / SEC',victim.x,victim.y+45,'#ff6576',12);
        }}continue;
      }
      const own=p.id===s.selfId,c=own?0xf0f7ee:p.bot?0x7594aa:0xf1ba70,r=playerRadius(p);this.sprite(`avatar-${p.id}`,`avatar-${p.avatar??0}`,p.x,p.y,r*2.8);if(own||p.protectedUntil>s.tick)g.lineStyle(1,own?0x7ef9d0:c,.65).strokeCircle(p.x,p.y,r+6);
      if(p.whale){g.lineStyle(3,0x8cddff).strokeEllipse(p.x,p.y,r*3.6,r*2.5);g.fillStyle(0x8cddff,.85).fillTriangle(p.x-r*1.5,p.y,p.x-r*2.1,p.y-12,p.x-r*2.1,p.y+12);g.lineStyle(2,0xc9f3ff).lineBetween(p.x,p.y-r-5,p.x-4,p.y-r-16).lineBetween(p.x,p.y-r-5,p.x+5,p.y-r-15);}if(p.bankTicks)g.lineStyle(4,0x78efd0).beginPath().arc(p.x,p.y,r+12,-Math.PI/2,-Math.PI/2+Math.PI*2*p.bankTicks/90).strokePath();
      this.label(`p${p.id}`,`${own?'YOU':p.name}${p.whale?' · WHALE':''}`,p.x,p.y-r-17,own?'#ffffff':'#9eb6c6',12);
    }
    for(const e of s.events){const age=(s.tick-e.tick)/30;if(e.type==='pulse'&&age<.65)g.lineStyle(2,0x9ae8f5,1-age/.65).strokeCircle(e.x,e.y,reduced?100:20+age*200);}
    if(s.surge){const n=s.nodes.find(n=>n.id===s.surge!.nodeId);if(n)g.lineStyle(3,0xf3c675,reduced?.6:.45+Math.sin(s.tick*.15)*.2).strokeCircle(n.x,n.y,n.fieldRadius+8);}
    if(s.phase!=='playing'){g.lineStyle(5,0xf08080,.85).strokeCircle(CLOSE_CENTER.x,CLOSE_CENTER.y,s.closeRadius);this.label('close',`MARKET CLOSE · ${Math.ceil(s.remainingTicks/30)}s · OUTSIDE = DAMAGE`,720,30,'#f6a2a2',20);}
    if(s.phase==='closing'){const self=s.players.find(p=>p.id===s.selfId);if(self&&!self.respawnTick&&Math.hypot(self.x-CLOSE_CENTER.x,self.y-CLOSE_CENTER.y)>s.closeRadius){g.fillStyle(0xe83333,reduced?.1:.08+.04*Math.sin(s.tick/8)).fillRect(0,0,1440,900);this.label('storm','LEAVE THE STORM!',720,85,'#ffb0a0',26);}}
    if(s.phase==='finished'){g.fillStyle(0x070d18,.78).fillRect(0,340,1440,190);this.label('end','MARKET CLOSED',720,410,'#78efd0',40);this.label('winner',`Winner: ${leaderboard(s.players)[0]?.name??'—'} · play again with “New match”`,720,470,'#d4e6ee',19);}
  }
}
function createGame(){return new Phaser.Game({type:Phaser.AUTO,parent:'arena',width:1440,height:900,backgroundColor:'#080f1b',scene:ArenaScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true},render:{antialias:true}});}