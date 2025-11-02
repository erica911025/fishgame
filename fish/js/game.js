import { state } from './state.js';
import { setupCanvasSize } from './canvas.js';
import { loadAssets } from './assets.js';
import { ensureFishCount, stepFish, drawFish } from './fish.js';
import { maybeSpawnChest, stepItems, drawItems } from './items.js';
import { maybeSpawnObstacles, stepObstacles, drawObstacles } from './obstacles.js';
import { drawNet } from './hand.js';
import { startCamera } from './camera.js';
import { TARGET_FISH_COUNT, GAME_TIME } from './config.js';
import { updateTimeHUD, updateDurabilityHUD, updateRankHUD, updateGameInfoHUD, bindEndGame, showResultModal } from './hud.js';

const canvas = document.getElementById('stage');
const fx = document.getElementById('fx');

let ctx = setupCanvasSize(canvas);
let tId=null;

export function resetGame(){
  state.score=0; state.hits=0; state.tLeft=GAME_TIME;
  state.durability=1; state.failed=false;
  state.fish.length=0; state.items.length=0; state.obstacles.length=0;
  updateTimeHUD(); updateDurabilityHUD(); updateRankHUD(); updateGameInfoHUD();
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
  if(!state.running) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ensureFishCount(canvas);
  stepFish(canvas);
  drawFish(ctx);

  drawNet(ctx);

  // 撈魚 + 扣耐久（捏著才算）
  if(state.hand.pinch){
    for(let i=state.fish.length-1; i>=0; i--){
      const f = state.fish[i];
      const d = Math.hypot(f.x-state.hand.x, f.y-state.hand.y);
      if(d < state.hand.radius){
        state.score++; state.hits++;
        state.fish.splice(i,1);
      }
    }
    state.durability = Math.max(0, state.durability - 0.004);
    updateDurabilityHUD();
    updateRankHUD();
  }

  maybeSpawnChest(0.016, canvas);
  stepItems(0.016); drawItems(ctx);

  maybeSpawnObstacles(0.016, canvas);
  stepObstacles(0.016); drawObstacles(ctx, canvas);

  updateGameInfoHUD();
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

  const seq = ["3", "2", "1", "開始!"];

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