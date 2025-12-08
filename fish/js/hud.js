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
const rankHint = document.getElementById('rankHint');
const modalMask = document.getElementById('modalMask');
const resultTitle = document.getElementById('resultTitle');
const resultLine = document.getElementById('resultLine');
const resultHint = document.getElementById('resultHint');
let missHintTimer = null;
let hintVisible = false;

export function getRank(s) { let cur = RANKS[0]; for (const r of RANKS) { if (s >= r.min) cur = r; else break; } return cur; }
export function getNextRank(s) { for (const r of RANKS) { if (s < r.min) return r; } return null; }

export function updateRankHUD() {
  const cur = getRank(state.score), nxt = getNextRank(state.score);
  rankNowEl.textContent = cur.title;
  rankNextEl.textContent = nxt ? `（再 ${nxt.min - state.score} 分升級：${nxt.title}）` : '（最高稱號）';
}
export function updateMissHint() {
  if (!rankHint) return;

  console.log('[updateMissHint] missStreak =', state.missStreak);

  if (state.missStreak >= 5) {
    rankHint.textContent = '慢慢靠近魚再捏合，比較容易撈到喔～';
    rankHint.classList.add('show');

    // 第一次達到條件時才開 timer，不要每次都重開
    if (!hintVisible) {
      hintVisible = true;
      clearTimeout(missHintTimer);
      missHintTimer = setTimeout(() => {
        // 3 秒後自動關閉提示，並重置狀態（下一次重新累積）
        rankHint.classList.remove('show');
        rankHint.textContent = '';
        hintVisible = false;
        state.missStreak = 0;
      }, 3000);
    }
  } else {
    // missStreak < 5 的情況
    // 代表：還沒達到 5 次，或是已經被「撈到魚」歸零
    if (hintVisible) {
      // 提示目前正顯示，但 missStreak 被歸零（通常是抓到魚）
      // → 立刻關掉提示，不等 3 秒
      rankHint.classList.remove('show');
      rankHint.textContent = '';
      hintVisible = false;
      clearTimeout(missHintTimer);
      missHintTimer = null;
    }
  }
}

export function updateGameInfoHUD() {
  // 分數、命中、FPS
  scoreEl.textContent = state.score;
  hudHit.textContent = state.hits;
  fpsEl.textContent = Math.round(state.fps || 0);

  // // ===== COMBO 顯示效果 =====
  // if (state.comboCount >= 2 && state.comboTime > 0) {
  //   comboEl.style.opacity = 1;
  //   comboEl.textContent = `${state.comboCount} COMBO!`;

  //   // 給不同段數的 combo 不同 tier（之後可以用 data-tier 在 CSS 做漸層）
  //   let tier = 1;
  //   if (state.comboCount >= 10) tier = 3;
  //   else if (state.comboCount >= 5) tier = 2;
  //   comboEl.dataset.tier = tier;

  //   comboEl.classList.add('combo-show');
  // } else {
  //   comboEl.style.opacity = 0;
  //   comboEl.classList.remove('combo-show');
  // }
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

// ====== COMBO 華麗特效：爆光 + 飄字 ======
// ====== COMBO 華麗特效：在撈網附近飄字 ======
export function triggerComboFX(combo) {
  // 3 連擊以上再顯示，避免一開始一直閃
  if (combo < 3) return;

  const canvas = document.getElementById('stage'); // 你的主畫布 id
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  // 撈網在畫布內的座標（state.hand.x,y 是以 canvas 為基準）
  const x = rect.left + state.hand.x;
  const y = rect.top + state.hand.y;

  // 建立一次性的飄字元素
  const float = document.createElement('div');
  float.className = 'combo-float';
  float.textContent = `${combo} COMBO!!`;

  float.style.left = x + 'px';
  float.style.top  = y + 'px';

  document.body.appendChild(float);

  // 動畫結束後移除
  setTimeout(() => {
    float.remove();
  }, 700);
}
