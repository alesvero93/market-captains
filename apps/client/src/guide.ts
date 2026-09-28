const slides=[
  {icon:'✦',title:'Small captain. Big ambitions.',text:'Collect glowing liquidity fragments. Carry them to a green WALLET and stand still for 3 seconds to bank your points. The biggest score wins the ten-minute match.',detail:'WASD / arrow keys to move · Shift to boost · Space to pulse'},
  {icon:'◈',title:'Cargo is risky. Wallets are safe.',text:'Cargo slows you down and drops when you are eliminated. Banked points stay yours and make your captain rounder. Watch your integrity and save energy for an escape.',detail:'Up to 10 captains · friends replace bots · share INVITE A FRIEND'},
  {icon:'⇄',title:'Ride the market.',text:'LONG and SHORT control a current, not a trade. Press Q to switch direction. At a rising node, LONG pushes the current outward; SHORT pulls it inward. Falling nodes reverse this. Animated arrows show the current you selected. Gravity still pulls inward.',detail:'Near-zero momentum means a weak current. Market indices are not financial forecasts.'},
  {icon:'⌁',title:'Something red is watching.',text:'The slow red HACKER drains 2 cargo points per second on contact. Escape, pulse it away or reach a wallet shield. Banked points are untouchable. It replaces a bot for two surprise visits: 60 seconds each, at most.',detail:'No spare bot at 10 human players? No hacker. In MARKET CLOSE, stay inside the shrinking circle.'},
];
let dialog:HTMLDialogElement, index=0;
export function guideOpen(){return dialog?.open??false;}
export function openGuide(){index=0;render();dialog.showModal();}
function render(){const s=slides[index]!;dialog.querySelector('#guide-icon')!.textContent=s.icon;dialog.querySelector('#guide-title')!.textContent=s.title;dialog.querySelector('#guide-text')!.textContent=s.text;dialog.querySelector('#guide-detail')!.textContent=s.detail;dialog.querySelector('#guide-count')!.textContent=`${index+1} / ${slides.length}`;dialog.querySelector<HTMLButtonElement>('#guide-prev')!.disabled=index===0;dialog.querySelector('#guide-next')!.textContent=index===slides.length-1?'LET’S PLAY →':'NEXT →';}
export function installGuide(release:()=>void){
  document.body.insertAdjacentHTML('beforeend',`<dialog id="guide" aria-labelledby="guide-title"><button id="guide-close" aria-label="Close guide">✕</button><p class="overline">MARKET CAPTAINS / QUICK GUIDE</p><div id="guide-icon" aria-hidden="true"></div><h2 id="guide-title"></h2><p id="guide-text"></p><p id="guide-detail"></p><nav aria-label="Guide pages"><button id="guide-prev" aria-label="Previous guide page">← BACK</button><span id="guide-count" aria-live="polite"></span><button id="guide-next">NEXT →</button></nav><small>← → to browse · Esc to close · GUIDE to reopen. Live matches keep running.</small></dialog>`);
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
