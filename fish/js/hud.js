// hud.js
// ✅ 處理 UI HUD：分數、時間、稱號、耐久條、結算視窗

import { state } from "./state.js";
import { RANKS } from "./config.js";
import { startFireworks, stopFireworks } from "./effects.js";

// --- DOM --- //
const scoreEl = document.getElementById("score");
const hudHit = document.getElementById("hudHit");
const fpsEl = document.getElementById("fps");
const durFill = document.getElementById("durFill");
const timeEl = document.getElementById("timeLeft");
const hudTime = document.getElementById("hudTime");

// 称號 HUD
const rankNowEl = document.getElementById("rankNow");
const rankNextEl = document.getElementById("rankNext");

// 結算 modal
const modalMask = document.getElementById("modalMask");
const rankNameEl = document.getElementById("rankName");
const resultTitle = document.getElementById("resultTitle");
const resultLine = document.getElementById("resultLine");
const resultHint = document.getElementById("resultHint");


// ✅ 計算稱號
export function getRank(score) {
  let cur = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.min) cur = r;
    else break;
  }
  return cur;
}

export function getNextRank(score) {
  for (const r of RANKS) {
    if (score < r.min) return r;
  }
  return null;
}

// ✅ 更新稱號 HUD
export function updateRankHUD() {
  const cur = getRank(state.score);
  const nxt = getNextRank(state.score);

  rankNowEl.textContent = cur.title;
  rankNextEl.textContent = nxt
    ? `（再 ${nxt.min - state.score} 分升級：${nxt.title}）`
    : "（最高稱號）";
}

// ✅ 更新分數/命中
export function updateGameInfoHUD() {
  scoreEl.textContent = state.score;
  hudHit.textContent = state.hits;
  fpsEl.textContent = state.fps.toFixed(0);
}

// ✅ 時間 HUD
export function updateTimeHUD() {
  timeEl.textContent = state.tLeft;
  hudTime.textContent = state.tLeft;
}

// ✅ 耐久條 HUD
export function updateDurabilityHUD() {
  durFill.style.width = `${state.durability * 100}%`;
}

// ✅ 扣耐久（撈網破）
export function damageNet(amount) {
  state.durability = Math.max(0, state.durability - amount);
  updateDurabilityHUD();

  if (state.durability <= 0 && !state.failed) {
    state.failed = true;
    endGame(true);
  }
}

// ✅ 顯示結算
export function showResultModal(broken) {
  const cur = getRank(state.score);
  const nxt = getNextRank(state.score);

  rankNameEl.textContent = cur.title;
  resultTitle.textContent = broken ? "撈網破掉了！" : "時間到！";
  resultLine.textContent = `分數 ${state.score}｜稱號「${cur.title}」`;
  resultHint.textContent = nxt
    ? `再 ${nxt.min - state.score} 分升級「${nxt.title}」`
    : `已達最高稱號！`;

  modalMask.style.display = "flex";
  startFireworks();
}

export function hideResultModal() {
  modalMask.style.display = "none";
  stopFireworks();
}


// ✅ 引入 endGame（循環引用技巧）
let endGame = () => {};
export function bindEndGame(fn) {
  endGame = fn;
}
