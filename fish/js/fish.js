// fish.js
// ✅ 管理魚：產生 / 移動 / 增速 / 被抓 + 加分

import { state } from "./state.js";
import { rand } from "./utils.js";
import {
  TARGET_FISH_COUNT,
  FISH_TYPES,
  DIFF_SPEED_GROWTH_PER_SEC,
  DECAY_PER_CATCH
} from "./config.js";

import { damageNet } from "./hud.js";
import { popToast, ping } from "./effects.js";


// ✅ 產生一隻魚
export function createFish(canvas) {
  const W = canvas.width;
  const H = canvas.height;

  const t = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
  const r = rand(t.size[0], t.size[1]);
  const sp = (Math.random() * 2 + 1) * t.speed;
  const a = Math.random() * Math.PI * 2;

  return {
    type: t.key,
    hue: t.hue,
    score: t.score,

    x: Math.random() * W,
    y: Math.random() * H,
    vx: Math.cos(a) * sp * (Math.random() < .5 ? -1 : 1),
    vy: Math.sin(a) * sp,

    r,
    alive: true,
    tw: 0 // 閃爍動畫參數
  };
}


// ✅ 保持魚數
export function ensureFish(canvas) {
  while (state.fish.length < TARGET_FISH_COUNT) {
    state.fish.push(createFish(canvas));
  }
}


// ✅ 隨時間加速（難度曲線）
function fishSpeedMul() {
  if (!state.startTs) return 1;
  const sec = (performance.now() - state.startTs) / 1000;
  return 1 + sec * DIFF_SPEED_GROWTH_PER_SEC;
}


// ✅ 魚移動 & 撞牆
export function stepFish(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const mul = fishSpeedMul();

  for (const f of state.fish) {
    f.vx += (Math.random() - .5) * 0.2;
    f.vy += (Math.random() - .5) * 0.2;

    const speed = Math.hypot(f.vx, f.vy);
    const maxS = 2.8 * mul;
    if (speed > maxS) {
      f.vx = f.vx / speed * maxS;
      f.vy = f.vy / speed * maxS;
    }

    f.x += f.vx;
    f.y += f.vy;

    // 邊界反彈
    if (f.x < f.r) f.vx = Math.abs(f.vx), f.x = f.r;
    if (f.x > W - f.r) f.vx = -Math.abs(f.vx), f.x = W - f.r;
    if (f.y < f.r) f.vy = Math.abs(f.vy), f.y = f.r;
    if (f.y > H - f.r) f.vy = -Math.abs(f.vy), f.y = H - f.r;

    // ✅ 撞網 → 得分 + 損耗
    if (state.hand.pinch && state.hand.visible && !state.failed) {
      const d = Math.hypot(f.x - state.hand.x, f.y - state.hand.y);
      if (d < state.hand.radius) {
        state.score += f.score;
        state.hits++;

        damageNet(DECAY_PER_CATCH);
        popToast(`+${f.score} 🐟`);
        ping();

        Object.assign(f, createFish(canvas)); // 重生魚
      }
    }

    f.tw++;
  }
}


// ✅ 畫魚
export function drawFish(ctx) {
  for (const f of state.fish) {
    const hue = (f.type === "glow")
      ? (f.hue + Math.sin(f.tw * 0.2) * 50)
      : f.hue;

    // 身體
    ctx.beginPath();
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();

    // 尾巴
    ctx.beginPath();
    ctx.moveTo(f.x - f.r, f.y);
    ctx.quadraticCurveTo(f.x - f.r * 2, f.y - f.r * 0.6, f.x - f.r * 0.8, f.y - f.r * 0.2);
    ctx.quadraticCurveTo(f.x - f.r * 2, f.y + f.r * 0.6, f.x - f.r, f.y);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = "#0b1220";
    ctx.beginPath();
    ctx.arc(f.x + f.r * 0.35, f.y - f.r * 0.2, f.r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}
