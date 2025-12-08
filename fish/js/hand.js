import { state } from './state.js';
import { PINCH_THRESHOLD_RATIO} from './config.js';
import { damageNet } from './hud.js';

export function bindMouseNet(canvas){
  // 滑鼠 fallback
  let pressing = false;
  canvas.addEventListener('pointerdown', e=>{ pressing=true; updatePos(e); state.hand.pinch=true; state.hand.visible=true; });
  canvas.addEventListener('pointermove', e=>{ if(pressing){ updatePos(e); }});
  canvas.addEventListener('pointerup',   ()=>{ pressing=false; state.hand.pinch=false; });
  canvas.addEventListener('pointerleave',()=>{ pressing=false; state.hand.pinch=false; });
  function updatePos(e){
    const rect = canvas.getBoundingClientRect();
    state.hand.x = (e.clientX-rect.left);
    state.hand.y = (e.clientY-rect.top);
  }
}
export function drawNet(ctx){
  if(!state.hand.visible && !state.hand.pinch) return;
  const {x,y} = state.hand;
  state.hand.radius = 40 + 40*state.durability;

  let ring='#93c5fd', mesh='rgba(147,197,253,.25)';
  if(state.durability<.66 && state.durability>.15){ ring='#f59e0b'; mesh='rgba(245,158,11,.28)'; }
  if(state.durability<=.15){ ring='#ef4444'; mesh='rgba(239,68,68,.35)'; }

  const R = state.hand.radius, step=12;
  ctx.save(); ctx.lineWidth=3;

  ctx.beginPath(); ctx.strokeStyle=ring; ctx.arc(x,y,R,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=mesh;
  for(let dx=-R; dx<=R; dx+=step){ const hh=Math.sqrt(Math.max(0,R*R-dx*dx)); ctx.beginPath(); ctx.moveTo(x+dx,y-hh); ctx.lineTo(x+dx,y+hh); ctx.stroke(); }
  for(let dy=-R; dy<=R; dy+=step){ const hh=Math.sqrt(Math.max(0,R*R-dy*dy)); ctx.beginPath(); ctx.moveTo(x-hh,y+dy); ctx.lineTo(x+hh,y+dy); ctx.stroke(); }

  ctx.beginPath(); ctx.fillStyle='#fff'; ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// MediaPipe 回調處理
export function onHandResults(results, canvas){
  const W = canvas.width/state.dpr, H = canvas.height/state.dpr;
  if(results.multiHandLandmarks && results.multiHandLandmarks.length){
    const lm = results.multiHandLandmarks[0], tip=lm[8], thumb=lm[4];
    const rawX = thumb.x, rawY = thumb.y;
    state.hand.x = (state.mirror ? (1-rawX):rawX) * W;
    state.hand.y = rawY * H;
    state.hand.visible = true;

    // ✅ 計算手移動速度
    const prevX = state.hand.prevX ?? state.hand.x;
    const prevY = state.hand.prevY ?? state.hand.y;

    const dx = state.hand.x - prevX;
    const dy = state.hand.y - prevY;

    state.hand.speed = Math.hypot(dx, dy);

    // 保存前一幀座標供下次使用
    state.hand.prevX = state.hand.x;
    state.hand.prevY = state.hand.y;


    const tx8 = state.mirror ? (1-tip.x):tip.x;
    const tx4 = state.mirror ? (1-thumb.x):thumb.x;
    const pdx = (tx8-tx4)*W, pdy=(tip.y-thumb.y)*H;
    const dist = Math.hypot(pdx,pdy);
    const pinchThreshold = Math.min(W,H) * PINCH_THRESHOLD_RATIO;
    const isPinch = dist < pinchThreshold;

    if (isPinch) {
      // 持續捏住：累積捏合幀數
      state.pinchFrames++;
    }
    state.wasPinch = isPinch;
    state.hand.pinch = isPinch;
  } else {
    // 沒偵測到手勢：不要額外扣耐久，只重置狀態
    state.pinchFrames = 0;
    state.wasPinch = false;
    // 讓使用者看得到網
    state.hand.visible = true;
  }
}