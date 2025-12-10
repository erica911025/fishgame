// js/main.js
import { startGame, resetGame, resize, runCountdown, resumeGame, resetToInitial } from './game.js';
import { state } from './state.js';
import { bindMouseNet } from './hand.js';
import { hideResultModal } from './hud.js';

const btnStart   = document.getElementById('btnStart');
const btnReset   = document.getElementById('btnReset');
const btnAgain   = document.getElementById('btnAgain');
const btnClose   = document.getElementById('btnClose');
const mirrorChk  = document.getElementById('mirrorChk');
const canvas     = document.getElementById('stage');
const themeSelect = document.getElementById('themeSelect');

bindMouseNet(canvas); // 滑鼠撈網 fallback
resize();             // 呼叫「game.js」裡 export 出來的 resize

btnReset.addEventListener('click', ()=> resetToInitial());
btnClose.addEventListener('click', ()=> { hideResultModal(); });

mirrorChk.addEventListener("change", () => {
  state.mirror = mirrorChk.checked;
  // index.html 有 id="video"，這裡用全域的 video
  video.style.transform = state.mirror ? "scaleX(-1)" : "scaleX(1)";
});

btnAgain.addEventListener('click', async () => {
  hideResultModal();
  await startGame({ paused: true });
  await runCountdown();
  resumeGame();
});

btnStart.addEventListener("click", async () => {
  await startGame({ paused: true });
  await runCountdown();
  resumeGame();
});

// 🎨 Theme switching
const THEME_CLASSES = [
  'theme-night-cozy',
  'theme-night-spooky',
  'theme-day-cozy',
  'theme-day-spooky'
];

function applyTheme(value) {
  document.body.classList.remove(...THEME_CLASSES);
  document.body.classList.add('theme-' + value);

  window.currentTheme = value;

  switch (value) {
    case 'night-spooky':
      document.body.classList.add('theme-night-spooky');
      break;
    case 'day-cozy':
      document.body.classList.add('theme-day-cozy');
      break;
    case 'day-spooky':
      document.body.classList.add('theme-day-spooky');
      break;
    case 'night-cozy':
    default:
      document.body.classList.add('theme-night-cozy');
      break;
  }
}

// 啟動時先套用預設主題
applyTheme(themeSelect.value);

// 監聽使用者切換主題
themeSelect.addEventListener('change', () => {
  applyTheme(themeSelect.value);
});
