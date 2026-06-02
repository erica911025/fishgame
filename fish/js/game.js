// js/game.js
import { state } from './state.js';
import { setupCanvasSize } from './canvas.js';
import { loadAssets } from './assets.js';
import { ensureFishCount, stepFish, drawFish } from './fish.js';
import { maybeSpawnChest, stepItems, drawItems } from './items.js';
import { maybeSpawnObstacles, stepObstacles, drawObstacles } from './obstacles.js';
import { drawNet } from './hand.js';
import { startCamera } from './camera.js';
import { TARGET_FISH_COUNT, GAME_TIME, COMBO_TIMEOUT } from './config.js';
import {
  updateTimeHUD,
  updateDurabilityHUD,
  updateRankHUD,
  updateGameInfoHUD,
  showResultModal,
  updateMissHint,
  damageNet,
  triggerComboFX,
  bindEndGame
} from './hud.js';
import { play } from './sfx.js';


const canvas = document.getElementById('stage');
const fx     = document.getElementById('fx');
const MISS_HINT_WINDOW = 3;

let ctx   = setupCanvasSize(canvas);
let fxCtx = setupCanvasSize(fx);
let tId   = null;

// ====== 重設遊戲數值 ======
export function resetGame() {
  state.score = 0;
  state.hits = 0;
  state.tLeft = GAME_TIME;

  state.comboCount = 0;
  state.comboTime  = 0;
  state.maxCombo   = 0;

  state.durability = 1;
  state.failed = false;

  state.missStreak = 0;
  state.caughtThisPinch = false;
  state.lastMissTime = 0;

  state.fish.length = 0;
  state.items.length = 0;
  state.obstacles.length = 0;
  state.fx.length = 0;

  updateTimeHUD();
  updateDurabilityHUD();
  updateRankHUD();
  updateGameInfoHUD();
  updateMissHint();
}

// ====== 回到初始畫面（按 Reset 鈕） ======
export function resetToInitial() {
  state.running = false;
  state.paused = false;
  clearInterval(tId);

  state.fish.length = 0;
  state.items.length = 0;
  state.obstacles.length = 0;
  state.fx.length = 0;

  state.score = 0;
  state.hits = 0;
  state.tLeft = GAME_TIME;
  state.comboCount = 0;
  state.comboTime = 0;
  state.maxCombo = 0;

  // 一開始耐久條想要沒有顏色 → 設為 0
  state.durability = 0;
  state.failed = false;
  state.missStreak = 0;
  state.caughtThisPinch = false;
  state.lastMissTime = 0;
  state.fps = 0;

  updateTimeHUD();
  updateDurabilityHUD();
  updateRankHUD();
  updateGameInfoHUD();
  updateMissHint();

  // 清畫面
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fxCtx.clearRect(0, 0, fx.width, fx.height);
}

// ====== 產生水花效果物件 ======
export function spawnSplash(x, y) {
  state.fx.push({
    x,
    y,
    r: 8,             // 初始半徑
    grow: 40,         // 擴散速度
    t: 0,             // 已經經過的時間
    life: 0.35,       // 動畫總長度（秒）
    color: 'rgba(255,255,255,0.9)'
  });
}

// ====== 把水花畫在 fx canvas 上 ======
function drawFX() {
  fxCtx.clearRect(0, 0, fx.width, fx.height);

  for (let i = state.fx.length - 1; i >= 0; i--) {
    const fxItem = state.fx[i];
    fxItem.t += 0.016; // 約每幀 16ms

    const life = fxItem.life;
    const t = fxItem.t / life; // 0 → 1

    if (t >= 1) {
      state.fx.splice(i, 1);
      continue;
    }

    const r = fxItem.r + t * fxItem.grow; // 半徑變大
    const alpha = (1 - t) * 0.6;          // 慢慢淡出

    fxCtx.save();
    fxCtx.globalAlpha = alpha;
    fxCtx.lineWidth = 2;
    fxCtx.strokeStyle = fxItem.color;

    fxCtx.beginPath();
    fxCtx.arc(fxItem.x, fxItem.y, r, 0, Math.PI * 2);
    fxCtx.stroke();

    fxCtx.restore();
  }
}

// （如果之後要做「miss 閃紅光」之類，可以改這裡）
function triggerMissFX() {
  // 目前先留空，避免 ReferenceError
}

// ====== 開始遊戲 ======
export async function startGame({ paused = false } = {}) {
  resetGame();
  await startCamera(canvas);

  state.running = true;
  state.paused = paused;

  if (!paused) {
    startTimer();
  }

  loop();
}

// ====== 計時器 ======
function startTimer() {
  clearInterval(tId);
  tId = setInterval(() => {
    if (!state.running || state.paused) return;
    state.tLeft--;
    updateTimeHUD();
    if (state.tLeft <= 0) endGame(false);
  }, 1000);
}

export function resumeGame() {
  state.paused = false;
  startTimer();
}

// ====== 遊戲結束 ======
function endGame(broken) {
  state.running = false;
  clearInterval(tId);
  showResultModal(!!broken);
}
bindEndGame(endGame);

// ====== 主迴圈 ======
function loop() {
  if (state.paused) {
    requestAnimationFrame(loop);
    return;
  }
  if (!state.running) return;

  // 進入這一幀前的 pinch 狀態，給後面判斷「剛放開」用
  const wasPinch = state.wasPinch;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ensureFishCount(canvas);
  stepFish(canvas);
  drawFish(ctx);

  drawNet(ctx);

  const dt = 0.016;

  // ====== 撈魚 + Combo + 耐久扣除 ======
  if (state.hand.pinch) {
    // 剛開始捏的那一瞬間
    if (!wasPinch) {
      state.caughtThisPinch = false;
      state.pinchStartTime = performance.now();
    }

    if (state.hand.pinch) {
  const now = performance.now();

  // ⭐ 如果距離上次播聲音已經超過 1000 ms，就再播一次
  if (!state.lastWaterTime || now - state.lastWaterTime >= 500) {
    // 🔥 在手的位置產生一圈水花
    spawnSplash(state.hand.x, state.hand.y);
    play("water");                 // 🔊 播 water.mp3
    state.lastWaterTime = now;     // 更新上次播放時間
  }

  // 📝 注意：下面這些是「判斷有沒有 miss / combo」用的
  // 若你原本有這些邏輯，建議不要每幀重設，還是用原本的 !wasPinch 那一段
  // state.caughtThisPinch = false;
  // state.pinchStartTime = performance.now();
}


    let caughtThisFrame = 0;

    for (let i = state.fish.length - 1; i >= 0; i--) {
      const f = state.fish[i];
      const d = Math.hypot(f.x - state.hand.x, f.y - state.hand.y);

      if (d < state.hand.radius) {
        caughtThisFrame++;

        // 撈到 → combo +1
        state.comboCount++;
        state.comboTime = COMBO_TIMEOUT;

        triggerComboFX(state.comboCount);

        const baseScore = (typeof f.score === 'number') ? f.score : 1;
        const isCombo = state.comboCount > 2; // 第 3 隻開始 combo
        const bonus = isCombo ? 1 : 0;
        const gain = baseScore + bonus;

        state.score += gain;
        state.hits++;

        // 在魚的地方也打一圈水花
        spawnSplash(f.x, f.y);

        state.fish.splice(i, 1);
      }
    }

    if (caughtThisFrame > 0) {
      state.caughtThisPinch = true;
      state.missStreak = 0;
      updateMissHint();
    }

    if (caughtThisFrame > 0 && state.comboCount > state.maxCombo) {
      state.maxCombo = state.comboCount;
    }

    // 持續捏著 → 一直扣耐久
    damageNet(0.004);
    updateRankHUD();
  }

  // ====== 剛放開 pinch 的瞬間 ======
  if (!state.hand.pinch && wasPinch) {
    const pinchDuration = performance.now() - (state.pinchStartTime || performance.now());
    const validPinch = pinchDuration > 120; // 過短當作誤觸

    if (validPinch && !state.caughtThisPinch) {
      // 真正一次 miss
      state.missStreak++;
      state.lastMissTime = performance.now();
      triggerMissFX();
    } else if (state.caughtThisPinch) {
      state.missStreak = 0;
    }

    state.caughtThisPinch = false;
    updateMissHint();
  }

  // ====== 道具（時間 / 寶箱） ======
  maybeSpawnChest(dt, canvas);
  stepItems(dt);
  drawItems(ctx);

  // ====== 障礙物（氣泡 / 垃圾） ======
  maybeSpawnObstacles(dt, canvas);
  stepObstacles(dt);
  drawObstacles(ctx, canvas);

  updateGameInfoHUD();

  // 🔥 每一幀畫水花 FX（疊在最上層）
  drawFX();

  // 更新「上一幀是否 pinch」狀態
  state.wasPinch = state.hand.pinch;

  requestAnimationFrame(loop);
}

// ====== 視窗尺寸改變 → 兩個 canvas 都要重設 ======
export function resize() {
  ctx   = setupCanvasSize(canvas);
  fxCtx = setupCanvasSize(fx);
}
window.addEventListener('resize', resize);

// ====== 啟動時預載圖片 ======
loadAssets();

// ====== 倒數動畫（3,2,1,START） ======
export async function runCountdown() {
  const overlay = document.getElementById('countdownOverlay');
  const text = document.getElementById('countdownText');

  const seq = ['3', '2', '1', 'START!'];

  overlay.classList.remove('hide');

  for (let i = 0; i < seq.length; i++) {
    text.innerText = seq[i];
    text.style.animation = 'none';
    void text.offsetWidth; // reset animation
    text.style.animation = '';
    await new Promise(r => setTimeout(r, 900));
  }

  overlay.classList.add('hide');
}
