// effects.js
// ✅ Toast / 水花 / 音效 / 煙火粒子

// Toast DOM
const toast = document.getElementById("toast");

// ✅ Toast 輸出
export function popToast(text) {
  toast.textContent = text;
  toast.style.display = "block";
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.transition = "opacity .6s";
    toast.style.opacity = "0";

    setTimeout(() => {
      toast.style.display = "none";
      toast.style.transition = "";
    }, 600);
  }, 80);
}



// ✅ 音效 — 撈到魚 "ping"
const ac = new (window.AudioContext || window.webkitAudioContext)();
export function ping() {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g).connect(ac.destination);
  o.frequency.value = 880;
  g.gain.value = 0.001;

  const now = ac.currentTime;
  g.gain.setTargetAtTime(0.06, now, 0.005);
  g.gain.setTargetAtTime(0.0001, now + 0.1, 0.03);

  o.start();
  o.stop(now + 0.25);
}


// ✅ 水花
export function splash(ctx, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x, y, 8 + i * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}



// ✅ 煙火 Fireworks canvas
const fxCanvas = document.getElementById("fx");
const fxCtx = fxCanvas.getContext("2d");

let fireworks = { running:false, parts:[] };

export function startFireworks() {
  fireworks.running = true;
  fireworks.parts.length = 0;
  stepFireworks();
}

export function stopFireworks() {
  fireworks.running = false;
  fireworks.parts.length = 0;
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
}

function launchFirework() {
  const W = fxCanvas.width, H = fxCanvas.height;
  const x = Math.random() * W * 0.8 + W * 0.1;
  const y = Math.random() * H * 0.2 + H * 0.15;
  const color = `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;

  for (let i = 0; i < 120; i++) {
    const a = (Math.PI * 2) * (i / 120);
    fireworks.parts.push({
      x,y,
      vx: Math.cos(a) * (1.5 + Math.random() * 2.5),
      vy: Math.sin(a) * (1.5 + Math.random() * 2.5),
      life: 60 + Math.random() * 20,
      color
    });
  }
}

// ✅ 動畫迴圈
function stepFireworks() {
  fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
  if (!fireworks.running) return;
  if (Math.random() < 0.08) launchFirework();

  fxCtx.globalCompositeOperation = "lighter";

  for (const p of fireworks.parts) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    p.life -= 1;

    fxCtx.globalAlpha = Math.max(0, p.life / 80);
    fxCtx.beginPath();
    fxCtx.fillStyle = p.color;
    fxCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    fxCtx.fill();
  }

  fireworks.parts = fireworks.parts.filter(p => p.life > 0);
  requestAnimationFrame(stepFireworks);
}
