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
  bindEndGame      // ★ 新增
} from './hud.js';

const canvas = document.getElementById('stage');
const fx = document.getElementById('fx');
const MISS_HINT_WINDOW = 3;

let ctx = setupCanvasSize(canvas);
let tId=null;

export function resetGame(){
  state.score=0; state.hits=0; state.tLeft=GAME_TIME;
  state.comboCount = 0; state.comboTime  = 0; state.maxCombo   = 0; // 連擊重設
  state.durability=1; state.failed=false;
  state.missStreak = 0; state.caughtThisPinch = false; state.lastMissTime = 0;
  state.fish.length=0; state.items.length=0; state.obstacles.length=0;
  updateTimeHUD(); updateDurabilityHUD(); updateRankHUD(); updateGameInfoHUD();updateMissHint(); 
}
export function resetToInitial() {
  // 停止遊戲與計時器
  state.running = false; state.paused = false; clearInterval(tId);
  // 清空場上的東西
  state.fish.length = 0; state.items.length = 0; state.obstacles.length = 0;
  // 數值回到初始顯示狀態
  state.score = 0; state.hits = 0; state.tLeft = GAME_TIME;
  state.comboCount = 0; state.comboTime = 0; state.maxCombo = 0;
  // 一開始耐久條是「沒有顏色」，所以設為 0
  state.durability = 0; state.failed = false; state.missStreak = 0;
  state.caughtThisPinch = false; state.lastMissTime = 0; state.fps = 0;
  // 更新 HUD
  updateTimeHUD(); updateDurabilityHUD(); updateRankHUD(); updateGameInfoHUD(); updateMissHint();
  // 清空畫面
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const fxCtx = fx.getContext('2d');
  fxCtx.clearRect(0, 0, fx.width, fx.height);
}

export async function startGame({ paused = false } = {}){
  resetGame();
  await startCamera(canvas);

  state.running = true;
  state.paused = paused;

  if (!paused) {
    startTimer();
  }

  loop();
}

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

function endGame(broken){
  state.running=false; clearInterval(tId);
  showResultModal(!!broken);
}
bindEndGame(endGame);

function loop(){
  if (state.paused) {
    requestAnimationFrame(loop);
    return;
  }
  if (!state.running) return;

  // 先記住這一幀「進來前」手是不是捏著
  const wasPinch = state.wasPinch;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ensureFishCount(canvas);
  stepFish(canvas);
  drawFish(ctx);

  drawNet(ctx);

  const dt = 0.016; // 每幀約 16ms(同spawn 道具)

  // // Combo 倒數：有連擊時，每幀扣時間
  // if (state.comboCount > 0) {
  //   state.comboTime -= dt;
  //   if (state.comboTime <= 0) {
  //     state.comboTime  = 0;
  //     state.comboCount = 0; // 時間到自動斷連擊
  //   }
  // }

  // 撈魚 + Combo + 扣耐久（捏著才算）
  if (state.hand.pinch) {
    // 這一幀是「剛剛開始捏」的那一瞬間
    if (!wasPinch) {
      state.caughtThisPinch = false;
    }

    let caughtThisFrame = 0;

    for (let i = state.fish.length - 1; i >= 0; i--) {
      const f = state.fish[i];
      const d = Math.hypot(f.x - state.hand.x, f.y - state.hand.y);

      if (d < state.hand.radius) {
        caughtThisFrame++;

        // 撈到魚 → 連擊 +1，並重置連擊倒數時間
        state.comboCount++;
        state.comboTime = COMBO_TIMEOUT;

        triggerComboFX(state.comboCount);

        // // 超過 3 隻開始算 combo：加倍得分
        const baseScore = (typeof f.score === 'number') ? f.score : 1;
        const isCombo = state.comboCount > 2;   // 第 3 隻開始算 combo
        const bonus   = isCombo ? 1 : 0;        // 有 combo 時額外 +1 分
        const gain    = baseScore + bonus;

        state.score += gain;
        state.hits++;

        state.fish.splice(i, 1);
      }
    }

    if (caughtThisFrame > 0) {
      // 這次捏網有撈到魚
      state.caughtThisPinch = true;
      state.missStreak = 0;   // 連續 miss 歸零
      updateMissHint();       // 清掉「慢慢靠近」提示（或顯示升級提示）
    }

    // 更新最高連擊
    if (caughtThisFrame > 0 && state.comboCount > state.maxCombo) {
      state.maxCombo = state.comboCount;
    }

    // 每幀捏著就扣一點耐久
    if (state.hand.pinch) {
      damageNet(0.004);
      updateRankHUD();
    }
  }

  // 檢查「剛放開捏合」這個瞬間
  if (!state.hand.pinch && wasPinch) {
    const elapsed = GAME_TIME - state.tLeft;  // 這局目前已經過幾秒

    if (!state.caughtThisPinch) {
      // ✅ 這一次完全沒撈到（抓空）→ 連擊直接重置
      state.comboCount = 0;
      state.comboTime  = 0;

      // 照原本邏輯更新 missStreak，給提示用
      if (elapsed - state.lastMissTime > MISS_HINT_WINDOW) {
        // 上一次 miss 已經是很久以前了 → 重新開始算
        state.missStreak = 1;
      } else {
        // 還在短時間內 → 累加 miss 次數
        state.missStreak++;
      }
      state.lastMissTime = elapsed;
    } else {
      // 這次有撈到，連續 miss 直接歸零
      state.missStreak = 0;
    }

    // 為下一次捏網重置旗標
    state.caughtThisPinch = false;
    updateMissHint();
  }




  maybeSpawnChest(dt, canvas);
  stepItems(dt); 
  drawItems(ctx);

  maybeSpawnObstacles(dt, canvas);
  stepObstacles(dt); 
  drawObstacles(ctx, canvas);

  updateGameInfoHUD();

  // 每幀更新上一次的 pinch 狀態（讓「剛放開」能被偵測到）
  state.wasPinch = state.hand.pinch;

  requestAnimationFrame(loop);
}


// 視窗尺寸改變 → 維持高畫質
export function resize(){
  ctx = setupCanvasSize(canvas);
}
window.addEventListener('resize', resize);

// 啟動時預載圖片
loadAssets();

export async function runCountdown() {
  const overlay = document.getElementById("countdownOverlay");
  const text = document.getElementById("countdownText");

  const seq = ["3", "2", "1", "START!"];

  overlay.classList.remove("hide");

  for (let i = 0; i < seq.length; i++) {
    text.innerText = seq[i];
    text.style.animation = "none";
    void text.offsetWidth; // reset animation
    text.style.animation = "";
    await new Promise(r => setTimeout(r, 900));
  }

  overlay.classList.add("hide");
}