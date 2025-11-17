import { state } from './state.js';
import { RANKS } from './config.js';

const scoreEl = document.getElementById('score');
const hudHit = document.getElementById('hudHit');
const fpsEl = document.getElementById('fps');
const durFill = document.getElementById('durFill');
const timeEl = document.getElementById('timeLeft');
const hudTime = document.getElementById('hudTime');
const comboEl = document.getElementById('combo');
const rankNowEl = document.getElementById('rankNow');
const rankNextEl = document.getElementById('rankNext');

const modalMask = document.getElementById('modalMask');
const resultTitle = document.getElementById('resultTitle');
const resultLine = document.getElementById('resultLine');
const resultHint = document.getElementById('resultHint');

export function getRank(s) { let cur = RANKS[0]; for (const r of RANKS) { if (s >= r.min) cur = r; else break; } return cur; }
export function getNextRank(s) { for (const r of RANKS) { if (s < r.min) return r; } return null; }

export function updateRankHUD() {
  const cur = getRank(state.score), nxt = getNextRank(state.score);
  rankNowEl.textContent = cur.title;
  rankNextEl.textContent = nxt ? `（再 ${nxt.min - state.score} 分升級：${nxt.title}）` : '（最高稱號）';
}
export function updateMissHint() {
  if (state.missStreak >= 5) {
    rankHint.textContent = '慢慢靠近魚再捏合，比較容易撈到喔～';
  } else {
    rankHint.textContent = '';
  }
}
export function updateGameInfoHUD() {
  scoreEl.textContent = state.score;
  hudHit.textContent = state.hits;
  fpsEl.textContent = state.fps ? state.fps.toFixed(0) : '—';

  // Combo 顯示：連擊數 > 2 才顯示（至少連三隻）
  if (comboEl) {
    if (state.comboCount > 2) {
      comboEl.textContent = `COMBO x${state.comboCount}`;
    } else {
      comboEl.textContent = '';
    }
  }
}

export function updateTimeHUD() { timeEl.textContent = state.tLeft; hudTime.textContent = state.tLeft; }
export function updateDurabilityHUD() { durFill.style.width = `${state.durability * 100}%`; }

let endGame = () => { };
export function bindEndGame(fn) { endGame = fn; }

export function damageNet(amount) {
  state.durability = Math.max(0, state.durability - amount);
  updateDurabilityHUD();
  if (state.durability <= 0 && !state.failed) { state.failed = true; endGame(true); }
}

export function showResultModal(broken) {
  const cur = getRank(state.score), nxt = getNextRank(state.score);
  resultTitle.textContent = broken ? '撈網破掉了！' : '時間到！';
  resultLine.textContent = `分數 ${state.score}｜稱號「${cur.title}」`;
  resultHint.textContent = nxt ? `再 ${nxt.min - state.score} 分升級「${nxt.title}」` : '已達最高稱號！';
  modalMask.style.display = 'flex';
}
export function hideResultModal() { modalMask.style.display = 'none'; }
