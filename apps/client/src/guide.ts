const slides=[
  {icon:'✦',title:'Small captain. Big ambitions.',text:'Collect glowing liquidity fragments. Carry them to a green WALLET and stand still for 3 seconds to bank your points. The biggest banked wallet wins the five-minute match.',detail:'Hold left mouse to steer · right mouse / Shift to boost · WASD / arrows also work · Space to pulse'},
  {icon:'◈',title:'Cargo is risky. Wallets are safe.',text:'Cargo slows you down and drops when you are eliminated. Wallet locations change every match. Inside their shields, ships can pass through each other and hostile pulses cannot interrupt deposits. Banked points stay yours and make your captain rounder. Health starts at 85. Fuel powers boost and pulse; it regenerates and is separate from health.',detail:'Singleplayer: 3–5 bots. Multiplayer: public lobby, optional invite, 3-minute maximum wait, then fill to 10 with bots.'},
  {icon:'⇄',title:'Ride the market.',text:'Only the WHALE (biggest banked wallet) can press Q to change the shared LONG / SHORT current, once every 2 seconds. Rising planets push outward with LONG; SHORT reverses them. Bitcoin instead spins clockwise / counterclockwise with no attraction. Its halo burns health and core contact destroys you. Release movement to brake.',detail:'Near-zero momentum means a weak current. Market indices are not financial forecasts.'},
  {icon:'◇',title:'Lead the market. Share the spoils.',text:'The whale has a blue tail and ring. It drops one 10-point blue diamond every 3 seconds. Only the current whale cannot collect diamonds; a former whale can. Tied wallets keep the current whale in charge.',detail:'Bank points to take control. Cargo alone does not make you a whale.'},
  {icon:'★',title:'Catch the surprise airdrop.',text:'One of five invented memecoins visits once per match for 30 seconds, dropping 15-point fragments. Follow the gold trail, collect and bank them. These are game tokens, not additional CMC assets.',detail:'Choose Relaxed, Challenging or Ruthless bots before each match.'},
  {icon:'⌁',title:'Something red is watching.',text:'The slow red HACKER drains 2 cargo points per second on contact. Escape, pulse it away or reach a wallet shield. Banked points are untouchable. It replaces a bot for two surprise visits: 60 seconds each, at most.',detail:'In the last minute, the circle smoothly shrinks toward a random safe wallet. Outside damage ramps up and newly spawned fragments are worth 10. Get in, deposit, and defend your lead.'},
];
let dialog:HTMLDialogElement, index=0;
export function guideOpen(){return dialog?.open??false;}
export function openGuide(){index=0;render();dialog.showModal();}
function render(){const s=slides[index]!;dialog.querySelector('#guide-icon')!.textContent=s.icon;dialog.querySelector('#guide-title')!.textContent=s.title;dialog.querySelector('#guide-text')!.textContent=s.text;dialog.querySelector('#guide-detail')!.textContent=s.detail;dialog.querySelector('#guide-count')!.textContent=`${index+1} / ${slides.length}`;dialog.querySelector<HTMLButtonElement>('#guide-prev')!.disabled=index===0;dialog.querySelector('#guide-next')!.textContent=index===slides.length-1?'LET’S PLAY →':'NEXT →';}
export function installGuide(release:()=>void){
  document.body.insertAdjacentHTML('beforeend',`<dialog id="guide" aria-labelledby="guide-title"><button id="guide-close" aria-label="Close guide">✕</button><p class="overline">MARKET CAPTAINS / QUICK GUIDE</p><div id="guide-icon" aria-hidden="true"></div><h2 id="guide-title"></h2><p id="guide-text"></p><p id="guide-detail"></p><nav aria-label="Guide pages"><button id="guide-prev" aria-label="Previous guide page">← BACK</button><span id="guide-count" aria-live="polite"></span><button id="guide-next">NEXT →</button></nav><small>← → to browse · Esc to close · GUIDE to reopen. The match timer keeps running, including here and in background tabs. Controls are released when you leave the arena.</small></dialog>`);
  dialog=document.querySelector<HTMLDialogElement>('#guide')!;
  const next=()=>{if(index===slides.length-1)dialog.close();else{index++;render();}};
  const prev=()=>{index=Math.max(0,index-1);render();};
  dialog.querySelector<HTMLButtonElement>('#guide-close')!.onclick=()=>dialog.close();
  dialog.querySelector<HTMLButtonElement>('#guide-prev')!.onclick=prev;
  dialog.querySelector<HTMLButtonElement>('#guide-next')!.onclick=next;
  dialog.addEventListener('close',release);
  window.addEventListener('keydown',e=>{if(!dialog.open)return;release();if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)(e.key==='ArrowLeft'?prev:next)();}},true);
  document.querySelectorAll<HTMLButtonElement>('[data-guide]').forEach(button=>{button.onclick=()=>{release();openGuide();};});
  openGuide();
}
