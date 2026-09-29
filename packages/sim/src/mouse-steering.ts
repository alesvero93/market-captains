import {normalizeMovement} from '@liquidity/shared';
/** Desired velocity steering slows near the cursor instead of orbiting the target. */
export function mouseSteering(p:{x:number;y:number;vx:number;vy:number},target:{x:number;y:number}){
 const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
 if(d<10)return {moveX:0,moveY:0};
 const speed=Math.min(300,(d-10)*3);
 return normalizeMovement((dx/d*speed*5.8-p.vx*4)/460,(dy/d*speed*5.8-p.vy*4)/460);
}
