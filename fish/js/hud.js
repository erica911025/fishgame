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

// ===== Rank calculation =====
export function getRank(s) {
  let cur = RANKS[0];
  for (const r of RANKS) {
    if (s >= r.min) cur = r;
    else break;
  }
  return cur;
}

export function getNextRank(s) {
  for (const r of RANKS) {
    if (s < r.min) return r;
  }
  return null;
}

// ===== Rank HUD update =====
export function updateRankHUD() {
  const cur = getRank(state.score),
        nxt = getNextRank(state.score);

  rankNowEl.textContent = cur.title;
  rankNextEl.textContent = nxt
    ? `(Need ${nxt.min - state.score} pts → ${nxt.title})`
    : `(Highest Rank)`;
}

// ===== Miss Hint System =====
export function updateMissHint() {
  if (!rankHint) return;

  console.log('[updateMissHint] missStreak =', state.missStreak);

  if (state.missStreak >= 5) {
    rankHint.textContent = 'Move closer to the fish before pinching!';
    rankHint.classList.add('show');

    if (!hintVisible) {
      hintVisible = true;
      clearTimeout(missHintTimer);

      missHintTimer = setTimeout(() => {
        // Auto-hide after 3s
        rankHint.classList.remove('show');
        rankHint.textContent = '';
        hintVisible = false;
        state.missStreak = 0;
      }, 3000);
    }
  } else {
    // < 5 misses OR miss streak reset
    if (hintVisible) {
      rankHint.classList.remove('show');
      rankHint.textContent = '';
      hintVisible = false;
      clearTimeout(missHintTimer);
      missHintTimer = null;
    }
  }
}

// ===== Main HUD =====
export function updateGameInfoHUD() {
  scoreEl.textContent = state.score;
  hudHit.textContent = state.hits;
  fpsEl.textContent = Math.round(state.fps || 0);

  // COMBO HUD hidden; only special effects remain
}

// ===== Time & Durability =====
export function updateTimeHUD() {
  timeEl.textContent = state.tLeft;
  hudTime.textContent = state.tLeft;
}

export function updateDurabilityHUD() {
  durFill.style.width = `${state.durability * 100}%`;
}

// ===== End Game Binding =====
let endGame = () => {};
export function bindEndGame(fn) {
  endGame = fn;
}

// ===== Damage / Break Net =====
export function damageNet(amount) {
  state.durability = Math.max(0, state.durability - amount);
  updateDurabilityHUD();

  if (state.durability <= 0 && !state.failed) {
    state.failed = true;
    endGame(true);
  }
}

// ===== Result Modal =====
export function showResultModal(broken) {
  const cur = getRank(state.score),
        nxt = getNextRank(state.score);

  resultTitle.textContent = broken
    ? 'Your Net Broke!'
    : 'Time’s Up!';

  resultLine.textContent = `Score: ${state.score} | Rank: ${cur.title}`;

  resultHint.textContent = nxt
    ? `Need ${nxt.min - state.score} more points to reach: ${nxt.title}`
    : 'You have reached the highest rank!';

  modalMask.style.display = 'flex';
}

export function hideResultModal() {
  modalMask.style.display = 'none';
}

// ===== COMBO Effect — Floating Text Near Hand =====
export function triggerComboFX(combo) {
  if (combo < 3) return;

  const canvas = document.getElementById('stage');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = rect.left + state.hand.x;
  const y = rect.top + state.hand.y;

  const float = document.createElement('div');
  float.className = 'combo-float';
  float.textContent = `${combo} COMBO!!`;

  float.style.left = x + 'px';
  float.style.top = y + 'px';

  document.body.appendChild(float);

  setTimeout(() => float.remove(), 700);
}
