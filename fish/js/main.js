import { startGame, resetGame, resize } from './game.js';
import { state } from './state.js';
import { bindMouseNet } from './hand.js';

const btnStart = document.getElementById('btnStart');
const btnReset = document.getElementById('btnReset');
const btnAgain = document.getElementById('btnAgain');
const btnClose = document.getElementById('btnClose');
const mirrorChk = document.getElementById('mirrorChk');
const canvas = document.getElementById('stage');

bindMouseNet(canvas); // 滑鼠撈網 fallback
resize();

// mirrorChk.addEventListener('change', ()=>{ state.mirror = mirrorChk=checked; });
btnStart.addEventListener('click', ()=> startGame());
btnReset.addEventListener('click', ()=> resetGame());
btnAgain.addEventListener('click', ()=> startGame());
btnClose.addEventListener('click', ()=> document.getElementById('modalMask').style.display='none');

mirrorChk.addEventListener("change", () => {
    state.mirror = mirrorChk.checked;
    video.style.transform = state.mirror ? "scaleX(-1)" : "scaleX(1)";
});