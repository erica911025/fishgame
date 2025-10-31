// hand.js
// ✅ 手勢偵測、網繪製與扣耐久

import { state } from "./state.js";
import { clamp } from "./utils.js";
import {
  PINCH_THRESHOLD_RATIO,
  PINCH_GRACE_FRAMES,
  DECAY_PER_PINCH_FRAME,
  PINCH_MAX_DECAY,
} from "./config.js";

import { damageNet } from "./hud.js"; // 扣耐久 UI
// (你之後會看到 hud.js 內有這函式)


// ✅ 處理手勢結果（由 MediaPipe 觸發）
export function onHandResults(results, canvas) {
  const W = canvas.width;
  const H = canvas.height;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];

    const tip = lm[8]; // 食指尖
    const thumb = lm[4]; // 拇指

    // 映射至畫面座標
    const rawX = tip.x;
    const rawY = tip.y;

    state.hand.x = (state.mirror ? 1 - rawX : rawX) * W;
    state.hand.y = rawY * H;
    state.hand.visible = true;

    // 計算兩點距離→判斷捏取
    const tx8 = state.mirror ? (1 - tip.x) : tip.x;
    const tx4 = state.mirror ? (1 - thumb.x) : thumb.x;

    const dx = (tx8 - tx4) * W;
    const dy = (tip.y - thumb.y) * H;
    const dist = Math.hypot(dx, dy);

    const pinchThreshold = Math.min(W, H) * PINCH_THRESHOLD_RATIO;
    const isPinch = dist < pinchThreshold;

    // ✅ 記錄連續捏取 frames（用來扣耐久）
    if (isPinch) {
      state.pinchFrames++;
    } else {
      // 結束時檢查捏多久
      if (state.wasPinch) applyPinchDecay();
      state.pinchFrames = 0;
    }

    state.wasPinch = isPinch;
    state.hand.pinch = isPinch;

    // ✅ 網大小隨耐久變化
    state.hand.radius = 40 + 40 * state.durability;

  } else {
    // 手不見了也要處理之前捏取累積
    if (state.wasPinch) applyPinchDecay();
    state.hand.visible = false;
    state.pinchFrames = 0;
    state.wasPinch = false;
  }
}


// ✅ 計算捏取造成的耐久扣除
function applyPinchDecay() {
  const excess = Math.max(0, state.pinchFrames - PINCH_GRACE_FRAMES);
  const decay = Math.min(PINCH_MAX_DECAY, excess * DECAY_PER_PINCH_FRAME);
  if (decay > 0) damageNet(decay);
}


// ✅ 畫撈網（主 loop 調用）
export function drawNet(ctx) {
  if (!state.hand.visible) return;

  const { x, y, radius } = state.hand;
  const d = state.durability;

  let ring = "#93c5fd";
  let mesh = "rgba(147,197,253,.25)";

  if (d < 0.66 && d > 0.15)
    ring = "#f59e0b", mesh = "rgba(245,158,11,.25)";
  else if (d <= 0.15)
    ring = "#ef4444", mesh = "rgba(239,68,68,.35)";

  ctx.save();
  ctx.lineWidth = 3;

  // ✅ 外圈
  ctx.beginPath();
  ctx.strokeStyle = ring;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // ✅ 網格
  ctx.strokeStyle = mesh;
  const step = 10;
  for (let dx = -radius; dx <= radius; dx += step) {
    const hh = Math.sqrt(Math.max(0, radius * radius - dx * dx));
    ctx.beginPath();
    ctx.moveTo(x + dx, y - hh);
    ctx.lineTo(x + dx, y + hh);
    ctx.stroke();
  }
  for (let dy = -radius; dy <= radius; dy += step) {
    const hh = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    ctx.beginPath();
    ctx.moveTo(x - hh, y + dy);
    ctx.lineTo(x + hh, y + dy);
    ctx.stroke();
  }

  // ✅ 中心點
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
