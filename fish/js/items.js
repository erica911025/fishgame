// items.js
// ✅ 寶箱：出現、倒數、撈到觸發 buff/debuff

import { state } from "./state.js";
import { rand } from "./utils.js";
import {
  CHEST_SPAWN_PPS
} from "./config.js";
import { clamp } from "./utils.js";
import { popToast } from "./effects.js";
import { updateRankHUD, updateTimeHUD, updateDurabilityHUD } from "./hud.js";

// ✅ 隨機出寶箱
export function maybeSpawnChest(dt, canvas) {
  if (Math.random() < CHEST_SPAWN_PPS * dt) {
    state.items.push({
      type: "chest",
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 16,
      life: 8 // 秒
    });
  }
}

// ✅ 更新寶箱與撈取判定
export function stepItems(dt) {
  for (const it of state.items) it.life -= dt;
  state.items = state.items.filter(it => it.life > 0);
}

// ✅ 畫寶箱 & 撈取效果
export function drawItems(ctx) {
  for (const it of state.items) {
    if (it.type !== "chest") continue;

    // --- 外觀 ---
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.fillStyle = "#c084fc";
    ctx.beginPath();
    ctx.arc(0, 0, it.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, it.r - 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1f2937";
    ctx.fillText("🎁", 0, 1);
    ctx.restore();

    // --- 撈到效果 ---
    if (state.hand.visible && state.hand.pinch) {
      const d = Math.hypot(it.x - state.hand.x, it.y - state.hand.y);
      if (d < state.hand.radius) triggerChestEffect(it);
    }
  }
}

// ✅ 實例效果
function triggerChestEffect(it) {
  const roll = Math.random();

  if (roll < 0.35) {
    // +8 秒
    state.tLeft = Math.min(999, state.tLeft + 8);
    updateTimeHUD();
    popToast("+8s ⏱️");

  } else if (roll < 0.65) {
    // 修網 +0.2
    const before = state.durability;
    state.durability = clamp(state.durability + 0.2, 0, 1);
    updateDurabilityHUD();
    popToast((state.durability > before) ? "修網 +20% 🕸️" : "修網已滿");

  } else if (roll < 0.85) {
    // +5 分
    state.score += 5;
    updateRankHUD();
    popToast("+5 ⭐");

  } else {
    // -5 分
    state.score = Math.max(0, state.score - 5);
    updateRankHUD();
    popToast("-5 ⚠️");
  }

  // 移除寶箱
  it.life = 0;
}
