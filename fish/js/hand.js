import { state } from './state.js';
import { PINCH_THRESHOLD_RATIO } from './config.js';
import { damageNet } from './hud.js';

export function bindMouseNet(canvas){
  // 滑鼠 fallback
  let pressing = false;
  canvas.addEventListener('pointerdown', e=>{
    pressing = true;
    updatePos(e);
    state.hand.pinch = true;
    state.hand.visible = true;
  });
  canvas.addEventListener('pointermove', e=>{
    if (pressing) {
      updatePos(e);
    }
  });
  canvas.addEventListener('pointerup',   ()=>{
    pressing = false;
    state.hand.pinch = false;
  });
  canvas.addEventListener('pointerleave',()=>{
    pressing = false;
    state.hand.pinch = false;
  });

  function updatePos(e){
    const rect = canvas.getBoundingClientRect();
    state.hand.x = (e.clientX - rect.left);
    state.hand.y = (e.clientY - rect.top);
  }
}

// 🎨 撈網繪製：依主題＋耐久度改變色調
export function drawNet(ctx){
  if (!state.hand.visible && !state.hand.pinch) return;

  const { x, y } = state.hand;
  state.hand.radius = 40 + 40 * state.durability;
  const R = state.hand.radius;
  const step = 12;

  // 先決定「主題底色」
  const theme =
    (typeof window !== 'undefined' && window.currentTheme) ?
      window.currentTheme : 'night-cozy';

  // 主題狀態下「健康網」的顏色（耐久度很高時用）
  let baseRing = '#93c5fd';
  let baseMesh = 'rgba(147,197,253,.25)';

  if (theme === 'night-spooky') {
    // 夜晚陰森：偏紫
    baseRing = '#a855f7';
    baseMesh = 'rgba(168,85,247,.30)';
  } else if (theme === 'day-cozy') {
    // 白天溫馨：亮藍
    baseRing = '#0ea5e9';
    baseMesh = 'rgba(56,189,248,.25)';
  } else if (theme === 'day-spooky') {
    // 白天陰森：偏綠
    baseRing = '#22c55e';
    baseMesh = 'rgba(34,197,94,.28)';
  }

  // 再依「耐久度」覆蓋顏色（中傷→橘，瀕壞→紅）
  let ring = baseRing;
  let mesh = baseMesh;
  if (state.durability < 0.66 && state.durability > 0.15) {
    ring = '#f59e0b';
    mesh = 'rgba(245,158,11,.28)';
  }
  if (state.durability <= 0.15) {
    ring = '#ef4444';
    mesh = 'rgba(239,68,68,.35)';
  }

  ctx.save();
  ctx.lineWidth = 3;

  // 外圈
  ctx.beginPath();
  ctx.strokeStyle = ring;
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.stroke();

  // 網格
  ctx.strokeStyle = mesh;
  for (let dx = -R; dx <= R; dx += step) {
    const hh = Math.sqrt(Math.max(0, R * R - dx * dx));
    ctx.beginPath();
    ctx.moveTo(x + dx, y - hh);
    ctx.lineTo(x + dx, y + hh);
    ctx.stroke();
  }
  for (let dy = -R; dy <= R; dy += step) {
    const hh = Math.sqrt(Math.max(0, R * R - dy * dy));
    ctx.beginPath();
    ctx.moveTo(x - hh, y + dy);
    ctx.lineTo(x + hh, y + dy);
    ctx.stroke();
  }

  // 網中心的小白點（手指位置）
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// MediaPipe 回調處理
export function onHandResults(results, canvas){
  const W = canvas.width / state.dpr;
  const H = canvas.height / state.dpr;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
    const lm = results.multiHandLandmarks[0];
    const tip = lm[8];
    const thumb = lm[4];

    // ✅ 撈網定位在「大拇指」
    const rawX = thumb.x;
    const rawY = thumb.y;
    state.hand.x = (state.mirror ? (1 - rawX) : rawX) * W;
    state.hand.y = rawY * H;
    state.hand.visible = true;

    // ✅ 計算手移動速度
    const prevX = state.hand.prevX ?? state.hand.x;
    const prevY = state.hand.prevY ?? state.hand.y;
    const dx = state.hand.x - prevX;
    const dy = state.hand.y - prevY;
    state.hand.speed = Math.hypot(dx, dy);
    state.hand.prevX = state.hand.x;
    state.hand.prevY = state.hand.y;

    // ✅ 捏合偵測（食指尖 + 大拇指）
    const tx8 = state.mirror ? (1 - tip.x) : tip.x;
    const tx4 = state.mirror ? (1 - thumb.x) : thumb.x;
    const pdx = (tx8 - tx4) * W;
    const pdy = (tip.y - thumb.y) * H;
    const dist = Math.hypot(pdx, pdy);
    const pinchThreshold = Math.min(W, H) * PINCH_THRESHOLD_RATIO;
    const isPinch = dist < pinchThreshold;

    if (isPinch) {
      // 持續捏住：累積捏合幀數（給其他邏輯用）
      state.pinchFrames++;
    }
    state.wasPinch = isPinch;
    state.hand.pinch = isPinch;

  } else {
    // 沒偵測到手勢：只重置狀態，不扣耐久
    state.pinchFrames = 0;
    state.wasPinch = false;
    // 讓使用者看得到網
    state.hand.visible = true;
  }
}
