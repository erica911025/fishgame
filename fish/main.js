(() => {
  // ====== DOM ======
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('video');
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const mirrorChk = document.getElementById('mirrorChk');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('timeLeft');
  const hudTime = document.getElementById('hudTime');
  const hudHit = document.getElementById('hudHit');
  const fpsEl = document.getElementById('fps');
  const durFill = document.getElementById('durFill');
  const toast = document.getElementById('toast');

  // ====== 佈局 ======
  function fitCanvas() {
    const rect = document.getElementById('stageWrap').getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
  }
  addEventListener('resize', fitCanvas); fitCanvas();

  // ====== 遊戲狀態 ======
  const state = {
    running:false,
    score:0,
    hits:0,
    tLeft:60,
    lastTs: performance.now(),
    fps: 0,
    durability: 1.0, // 0~1
    fish: [],
    mirror: true, // 🪞 預設鏡像模式
    hand: { pinch:false, x:0, y:0, visible:false, radius: 50 },
  };

  mirrorChk.addEventListener('change', ()=>{ state.mirror = mirrorChk.checked; });

  // ====== 金魚生成 ======
  function spawnFish(n=8){
    const W=canvas.width, H=canvas.height;
    state.fish.length = 0;
    for(let i=0;i<n;i++){
      state.fish.push({
        x: Math.random()*W, y: Math.random()*H,
        vx: (Math.random()*2+1)*(Math.random()<.5?-1:1),
        vy: (Math.random()*2-1),
        r: 14 + Math.random()*10,
        hue: 15 + Math.random()*30, // 橘紅色系
        alive: true,
        score: Math.random()<.2?5:(Math.random()<.5?2:1),
      });
    }
  }

  // ====== 視覺：背景水波 ======
  function drawWaterBG(t){
    const W=canvas.width, H=canvas.height;
    const grad = ctx.createRadialGradient(W*0.5, H*0.2, 10, W*0.5, H*0.5, Math.max(W,H));
    grad.addColorStop(0, 'rgba(96,165,250,0.20)');
    grad.addColorStop(1, 'rgba(30,64,175,0.08)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    // 簡單漣漪
    ctx.save();
    ctx.globalAlpha = 0.06;
    for(let i=0;i<6;i++){
      const r = (t*0.05 + i*60) % (Math.max(W,H));
      ctx.beginPath(); ctx.arc(W*0.5, H*0.45, r, 0, Math.PI*2);
      ctx.lineWidth = 2; ctx.strokeStyle = '#93c5fd'; ctx.stroke();
    }
    ctx.restore();
  }

  // ====== 視覺：金魚 ======
  function drawFish(f){
    if(!f.alive) return;
    // 身體
    ctx.beginPath();
    ctx.fillStyle = `hsl(${f.hue}, 80%, 60%)`;
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    ctx.fill();
    // 尾巴
    ctx.beginPath();
    ctx.moveTo(f.x - f.r, f.y);
    ctx.quadraticCurveTo(f.x - f.r*2, f.y - f.r*0.6, f.x - f.r*0.8, f.y - f.r*0.2);
    ctx.quadraticCurveTo(f.x - f.r*2, f.y + f.r*0.6, f.x - f.r, f.y);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#0b1220';
    ctx.beginPath(); ctx.arc(f.x + f.r*0.35, f.y - f.r*0.2, f.r*0.15, 0, Math.PI*2); ctx.fill();
  }

  function stepFish(dt){
    const W=canvas.width, H=canvas.height;
    for(const f of state.fish){
      if(!f.alive) continue;
      // 簡單游動：噪聲/轉向
      f.vx += (Math.random()-.5)*0.2; f.vy += (Math.random()-.5)*0.2;
      const speed = Math.hypot(f.vx, f.vy);
      const maxS = 2.8; if(speed>maxS){ f.vx = f.vx/speed*maxS; f.vy = f.vy/speed*maxS; }
      f.x += f.vx; f.y += f.vy;
      // 牆壁反彈
      if(f.x<f.r){ f.x=f.r; f.vx=Math.abs(f.vx); }
      if(f.x>W-f.r){ f.x=W-f.r; f.vx=-Math.abs(f.vx); }
      if(f.y<f.r){ f.y=f.r; f.vy=Math.abs(f.vy); }
      if(f.y>H-f.r){ f.y=H-f.r; f.vy=-Math.abs(f.vy); }
      // 碰撞：手網
      if(state.hand.pinch && state.hand.visible){
        const d = Math.hypot(f.x - state.hand.x, f.y - state.hand.y);
        if(d < state.hand.radius){
          f.alive = false;
          state.score += f.score;
          state.hits += 1;
          popToast(`+${f.score} 🐟`);
          ping();
        }
      }
    }
  }

  // ====== 手網繪製 ======
  function drawHandNet(){
    if(!state.hand.visible) return;
    ctx.save();
    // 網圈
    ctx.beginPath();
    ctx.arc(state.hand.x, state.hand.y, state.hand.radius, 0, Math.PI*2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = state.hand.pinch ? 'rgba(16,185,129,.95)' : 'rgba(147,197,253,.95)';
    ctx.stroke();
    // 把手位置
    ctx.beginPath();
    ctx.arc(state.hand.x, state.hand.y, 5, 0, Math.PI*2);
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();
    ctx.restore();
  }

  // ====== 音效（無外部檔案，簡易 Beep） ======
  const ac = new (window.AudioContext||window.webkitAudioContext)();
  function ping(){
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g).connect(ac.destination);
    o.frequency.value = 880; g.gain.value = 0.001; // 初始很小，避免爆音
    const now = ac.currentTime;
    g.gain.setTargetAtTime(0.06, now, 0.005);
    g.gain.setTargetAtTime(0.0001, now+0.1, 0.03);
    o.start(); o.stop(now+0.25);
  }

  // ====== UI ======
  function popToast(txt){
    toast.textContent = txt; toast.style.display='block';
    toast.style.opacity = '1';
    setTimeout(()=>{ toast.style.transition='opacity .6s'; toast.style.opacity='0'; setTimeout(()=>{toast.style.display='none'; toast.style.transition='';}, 600); }, 80);
  }

  // ====== 計時器 ======
  let timerId = null;
  function startTimer(){
    clearInterval(timerId);
    timerId = setInterval(()=>{
      if(!state.running) return;
      state.tLeft--; if(state.tLeft<0){ state.tLeft=0; endGame(); }
      timeEl.textContent = state.tLeft; hudTime.textContent = state.tLeft;
    }, 1000);
  }

  function endGame(){
    state.running=false;
    popToast(`時間到！總分 ${state.score}`);
  }

  function resetGame(){
    state.score=0; state.hits=0; state.tLeft=60; state.durability=1.0; scoreEl.textContent=0; hudHit.textContent=0;
    spawnFish(10);
  }

  // ====== MediaPipe Hands ======
  let camera = null; // MediaPipe Camera helper
  const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({ maxNumHands:1, modelComplexity: 1, minDetectionConfidence:0.6, minTrackingConfidence:0.5 });
  hands.onResults(onHands);

  function onHands(results){
    const W = canvas.width, H = canvas.height;
    if(results.multiHandLandmarks && results.multiHandLandmarks.length>0){
      const lm = results.multiHandLandmarks[0];
      // 轉換：landmark x,y 為 [0,1]，乘上 canvas 尺寸
      const i8 = lm[8]; // 食指尖
      const i4 = lm[4]; // 拇指尖
      const rawX = i8.x, rawY = i8.y;
      const cx = (state.mirror ? (1 - rawX) : rawX) * W; // 🪞 鏡像座標切換
      const cy = rawY * H;
      state.hand.x = cx; state.hand.y = cy; state.hand.visible = true;
      // 捏合距離（畫面比例）
      const dx = ((state.mirror ? (1 - i8.x) : i8.x) - (state.mirror ? (1 - i4.x) : i4.x)) * W;
      const dy = (i8.y - i4.y) * H;
      const dist = Math.hypot(dx, dy);
      const pinchThreshold = Math.min(W,H) * 0.06; // 門檻：螢幕短邊的 6%
      state.hand.pinch = dist < pinchThreshold;
      // 耐久度：過度捏合會下降，展網緩回
      if(state.hand.pinch){ state.durability -= 0.004; }
      else { state.durability += 0.0025; }
      state.durability = Math.max(0, Math.min(1, state.durability));
      durFill.style.width = `${state.durability*100}%`;
      // 耐久度低 → 網半徑變小（增加難度）
      state.hand.radius = 40 + 40 * state.durability;
    } else {
      state.hand.visible = false;
    }
  }

  // 利用 camera_utils 將 video 幀餵給 hands
  async function startCamera(){
    if(camera) return;
    camera = new Camera(video, { onFrame: async () => { await hands.send({image: video}); }, width: 640, height: 480 });
    await camera.start();
  }

  // ====== 主要渲染迴圈 ======
  function loop(ts){
    const dt = Math.min(33, ts - state.lastTs); // ms
    const fps = 1000 / (dt || 16.7); state.fps = fps; state.lastTs = ts;

    // 清空後畫
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawWaterBG(ts);
    stepFish(dt);
    for(const f of state.fish) drawFish(f);
    drawHandNet();

    // HUD
    scoreEl.textContent = state.score; hudHit.textContent = state.hits; fpsEl.textContent = state.fps.toFixed(0);

    if(state.running) requestAnimationFrame(loop);
  }

  // ====== 事件 ======
  btnStart.addEventListener('click', async ()=>{
    if(!state.running){
      mirrorChk.checked = true; state.mirror = true; // 預設鏡像開啟
      resetGame();
      state.running = true; requestAnimationFrame(loop);
      startTimer();
      await startCamera();
    }
  });
  btnReset.addEventListener('click', ()=>{ resetGame(); });

  // 初始
  resetGame();
})();