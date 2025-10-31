import { state } from './state.js';
import { FISH_TYPES, TARGET_FISH_COUNT } from './config.js';
import { ASSETS } from './assets.js';

export function createFish(canvas){
  const t = FISH_TYPES[Math.floor(Math.random()*FISH_TYPES.length)];
  const a = Math.random()*Math.PI*2;
  const sp= (1.2+Math.random()*1.4) * t.speed;
  const [w,h] = t.size;
  return {
    type:t.key, img:ASSETS.fish[t.key], score:t.score,
    x: Math.random()*canvas.width/state.dpr, 
    y: Math.random()*canvas.height/state.dpr,
    vx: Math.cos(a)*sp*(Math.random()<.5?-1:1),
    vy: Math.sin(a)*sp,
    w, h
  };
}

export function ensureFishCount(canvas){
  while(state.fish.length < TARGET_FISH_COUNT) state.fish.push(createFish(canvas));
}

export function stepFish(canvas){
  const W = canvas.width/state.dpr, H = canvas.height/state.dpr;
  for(const f of state.fish){
    f.vx += (Math.random()-.5)*0.1;
    f.vy += (Math.random()-.5)*0.1;
    const sp = Math.hypot(f.vx,f.vy);
    const max = 2.4;
    if(sp>max){ f.vx=f.vx/sp*max; f.vy=f.vy/sp*max; }
    f.x += f.vx; f.y += f.vy;
    if(f.x<0){ f.x=0; f.vx=Math.abs(f.vx); }
    if(f.y<0){ f.y=0; f.vy=Math.abs(f.vy); }
    if(f.x>W){ f.x=W; f.vx=-Math.abs(f.vx); }
    if(f.y>H){ f.y=H; f.vy=-Math.abs(f.vy); }
  }
}

export function drawFish(ctx){
  for(const f of state.fish){
    const img = f.img; if(!img || !img.complete) continue;
    ctx.save();
    if(f.vx<0){
      ctx.translate(f.x, f.y);
      ctx.scale(-1,1);
      ctx.drawImage(img, -f.w/2, -f.h/2, f.w, f.h);
    }else{
      ctx.drawImage(img, f.x - f.w/2, f.y - f.h/2, f.w, f.h);
    }
    ctx.restore();
  }
}
