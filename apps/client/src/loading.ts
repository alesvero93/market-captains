import poster from './assets/loading-poster.png?url';
let panel:HTMLElement|undefined;
export function showLoading(value:number,label:string){
  if(!panel){panel=document.createElement('section');panel.id='loading-screen';panel.setAttribute('aria-label','Loading Market Captains');
    panel.innerHTML=`<div style="width:min(680px,85vw);text-align:center;color:#bce9de;font:14px Arial"><img src="${poster}" alt="MARKET CAPTAINS — The market is the map" style="width:100%;max-height:66vh;object-fit:contain;border:1px solid #37655d;border-radius:16px"><progress aria-label="Loading progress" max="100" style="display:block;width:100%;height:10px;margin:22px 0;accent-color:#78efd0"></progress><p role="status"></p></div>`;
    panel.style.cssText='position:fixed;inset:0;z-index:1000;background:#080d16;display:grid;place-items:center';document.body.append(panel);}
  panel.hidden=false;panel.querySelector('progress')!.value=value;panel.querySelector('p')!.textContent=label;
}
export function hideLoading(){panel?.remove();panel=undefined;}
