// obstacles.js
// ✅ 泡泡 / 垃圾：生成 / 移動 / 撞擊判定

import { state } from "./state.js";
import { rand } from "./utils.js";
import {
  BUBBLE_SPAWN_PPS,
  TRASH_SPAWN_PPS
} from "./config.js";
import { popToast, splash } from "./effects.js";
import { damageNet } from "./hud.js";

// ✅ 生成障礙
export function maybeSpawnObstacles(dt, canvas) {
  // 泡泡向上飄
  if (Math.random() < BUBBLE_SPAWN_PPS * dt) {
    state.obstacles.push({
      type: "bubble",
      x: Math.random() * canvas.width,
      y: canvas.height + 20,
      r: rand(8, 16),
      vy: -rand(0.6, 1.2),
      life: 10
    });
  }

  // 垃圾向右漂
  if (Math.random() < TRASH_SPAWN_PPS * dt) {
    state.obstacles.push({
      type: "trash",
      x: -20,
      y: Math.random() * canvas.height,
      r: 14,
      vx: rand(1.2, 2.0),
      life: 12
    });
  }
}

// ✅ 更新動作 & 判定
export function stepObstacles() {
  for (const ob of state.obstacles) {
    ob.life -= 0.016;
    if (ob.type === "bubble") ob.y += ob.vy, ob.x += Math.sin(ob.y * 0.03) * 0.3;
    if (ob.type === "trash") ob.x += ob.vx;
  }

  state.obstacles = state.obstacles.filter(o => o.life > 0);
}

// ✅ 畫障礙 + 撞網判定
export function drawObstacles(ctx, canvas) {
  for (const ob of state.obstacles) {

    // --- 泡泡 ---
    if (ob.type === "bubble") {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(147,197,253,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (state.hand.visible) {
        const d = Math.hypot(ob.x - state.hand.x, ob.y - state.hand.y);
        if (d < state.hand.radius + ob.r * 0.6) {
          ob.life = 0;
          splash(ctx, ob.x, ob.y);
        }
      }
    }

    // --- 垃圾 ---
    else {
      ctx.save();
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0b1220";
      ctx.fillText("🗑️", ob.x, ob.y + 1);
      ctx.restore();

      // 撈到扣分/扣耐久
      if (state.hand.visible && state.hand.pinch) {
        const d = Math.hypot(ob.x - state.hand.x, ob.y - state.hand.y);
        if (d < state.hand.radius + ob.r * 0.5) {
          state.score = Math.max(0, state.score - 3);
          damageNet(0.05);
          popToast("-3 與損網 ⚠️");
          ob.life = 0;
        }
      }
    }
  }

  // 清除出界
  state.obstacles = state.obstacles.filter(o =>
    o.life > 0 &&
    o.x < canvas.width + 40 &&
    o.y > -40
  );
}
