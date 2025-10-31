import { state } from './state.js';
import { CHEST_SPAWN_PPS } from './config.js';
import { ASSETS } from './assets.js';
import { updateTimeHUD, updateDurabilityHUD } from './hud.js';

export function maybeSpawnChest(dt, canvas){
  if(Math.random() < CHEST_SPAWN_PPS*dt){
    const time = Math.random()<.5;
    state.items.push({
      type: time ? 'time':'treasure',
      x: Math.random()*canvas.width/state.dpr,
      y: Math.random()*canvas.height/state.dpr,
      r: 20, life: 8
    });
  }
}
export function stepItems(dt){
  for(const it of state.items) it.life -= dt;
  state.items = state.items.filter(it=> it.life>0);
}
export function drawItems(ctx){
  for(const it of state.items){
    const img = it.type==='time' ? ASSETS.time : ASSETS.treasure;
    if(img && img.complete) ctx.drawImage(img, it.x-it.r, it.y-it.r, it.r*2, it.r*2);
    // 撈到
    if(state.hand.visible && state.hand.pinch){
      const d = Math.hypot(it.x-state.hand.x, it.y-state.hand.y);
      if(d < state.hand.radius){
        if(it.type==='time'){ state.tLeft = Math.min(999, state.tLeft+8); updateTimeHUD(); }
        else{ state.durability = Math.min(1, state.durability+0.2); updateDurabilityHUD(); }
        it.life = 0;
      }
    }
  }
}
