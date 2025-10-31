// main.js
// ✅ 入口：初始化 / 綁 UI / 啟動遊戲

import { resetGame, startGame } from "./game.js";
import { hideResultModal } from "./hud.js";

// UI
const btnStart = document.getElementById("btnStart");
const btnAgain = document.getElementById("btnAgain");
const btnClose = document.getElementById("btnClose");
const mirrorChk = document.getElementById("mirrorChk");

// ✅ Mirror UI
mirrorChk.addEventListener("change", () => {
  state.mirror = mirrorChk.checked;
});

// ✅ Start
btnStart.addEventListener("click", async () => {
  resetGame();
  await startGame();
});

// ✅ 再玩一次
btnAgain.addEventListener("click", async () => {
  hideResultModal();
  resetGame();
  await startGame();
});

// ✅ 關閉結果視窗
btnClose.addEventListener("click", () => hideResultModal());
