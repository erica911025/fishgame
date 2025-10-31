import { state } from './state.js';
import { BUBBLE_SPAWN_PPS, TRASH_SPAWN_PPS, TRASH_TYPES } from './config.js';
import { ASSETS } from './assets.js';
import { updateDurabilityHUD } from './hud.js';

export function maybeSpawnObstacles(dt, canvas){
  if(Math.random() < BUBBLE_SPAWN_PPS*dt){
    state.obstacles.push({ type:'bubble', x:Math.random()*canvas.width/state.dpr, y:canvas.height/state.dpr+20, r:12, vy:-0.9, life:10 });
  }
  if(Math.random() < TRASH_SPAWN_PPS*dt){
    const idx = Math.floor(Math.random()*TRASH_TYPES.length);
    state.obstacles.push({ type:'trash', idx, x:-20, y:Math.random()*canvas.height/state.dpr, r:18, vx:1.6, life:12 });
  }
}
export function stepObstacles(dt){
  for(const o of state.obstacles){
    o.life -= dt;
    if(o.type==='bubble'){ o.y += o.vy; o.x += Math.sin(o.y*0.08)*0.3; }
    else { o.x += o.vx; }
  }
  state.obstacles = state.obstacles.filter(o=> o.life>0);
}
export function drawObstacles(ctx, canvas){
  for(const o of state.obstacles){
    if(o.type==='bubble'){
      ctx.save(); ctx.globalAlpha=.45; ctx.strokeStyle='#93c5fd'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.stroke(); ctx.restore();
      if(state.hand.visible){
        const d = Math.hypot(o.x-state.hand.x, o.y-state.hand.y);
        if(d < state.hand.radius + o.r*0.6) o.life=0;
      }
    }else{
      const img = ASSETS.trash[o.idx];
      if(img && img.complete) ctx.drawImage(img, o.x-o.r, o.y-o.r, o.r*2, o.r*2);
      if(state.hand.visible && state.hand.pinch){
        const d = Math.hypot(o.x-state.hand.x, o.y-state.hand.y);
        if(d < state.hand.radius + o.r*0.5){
          state.score = Math.max(0, state.score - TRASH_TYPES[o.idx].penalty);
          state.durability = Math.max(0, state.durability - 0.05); updateDurabilityHUD();
          o.life = 0;
        }
      }
    }
  }
  state.obstacles = state.obstacles.filter(o=> o.life>0 && o.x < canvas.width/state.dpr + 40 && o.y>-40);
}
