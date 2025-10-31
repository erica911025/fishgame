(() => {
  // ================= 可調參數（含新增功能） =================
  // 放開越快扣越少
  const PINCH_THRESHOLD_RATIO = 0.06;
  const PINCH_GRACE_FRAMES    = 6;
  const DECAY_PER_PINCH_FRAME = 0.010;
  const PINCH_MAX_DECAY       = 0.18;
  // 抓到魚的額外耗損
  const DECAY_PER_CATCH       = 0.08;
  // 場上魚數
  const TARGET_FISH_COUNT     = 10;

  // 多魚種設定（分數與速度）
  const FISH_TYPES = [
    { key:'red',    hue: 10,  score:1, speed:1.00, size:[16,24] },  // 紅魚：慢、1 分
    { key:'gold',   hue: 38,  score:3, speed:1.25, size:[16,24] },  // 金魚：中、3 分
    { key:'glow',   hue: 200, score:5, speed:1.65, size:[12,18] },  // 閃光魚：快、5 分（小型）
  ];

  // 道具 & 障礙生成機率（每秒機率）
  const CHEST_SPAWN_PPS       = 0.15;  // 寶箱（撈到觸發隨機效果）
  const BUBBLE_SPAWN_PPS      = 0.25;  // 泡泡（視覺干擾、被網碰到會爆）
  const TRASH_SPAWN_PPS       = 0.10;  // 垃圾（撈到 -3 分並扣耐久）

  // 難度成長（速度倍率：1 + t * GROWTH）
  const DIFF_SPEED_GROWTH_PER_SEC = 0.006; // 每秒 +0.6% 速

  // 分數區間與稱號
  const RANKS = [
    { min:   0, title: "新手撈手" },
    { min:  10, title: "撈魚學徒" },
    { min:  20, title: "撈魚高手" },
    { min:  35, title: "撈金魚達人" },
    { min:  50, title: "金魚界傳奇" },
  ];

  // ================= DOM =================
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const fx = document.getElementById('fx');
  const fxc = fx.getContext('2d');
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
  const rankNowEl = document.getElementById('rankNow');
  const rankNextEl = document.getElementById('rankNext');

  const modalMask = document.getElementById('modalMask');
  const rankNameEl = document.getElementById('rankName');
  const resultTitle = document.getElementById('resultTitle');
  const resultLine = document.getElementById('resultLine');
  const resultHint = document.getElementById('resultHint');
  const btnAgain = document.getElementById('btnAgain');
  const btnShot = document.getElementById('btnShot');
  const btnClose = document.getElementById('btnClose');

  // ================= 佈局 =================
  function fitCanvas() {
    const rect = document.getElementById('stageWrap').getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    fx.width = rect.width; fx.height = rect.height;
  }
  addEventListener('resize', fitCanvas); fitCanvas();

  // ================= 狀態 =================
  const state = {
    running:false,
    score:0,
    hits:0,
    tLeft:60,
    lastTs: performance.now(),
    startTs: null,
    fps: 0,
    durability: 1.0,
    fish: [],
    items: [],      // 寶箱
    obstacles: [],  // 泡泡、垃圾
    mirror: true,
    hand: { pinch:false, x:0, y:0, visible:false, radius: 50 },
    failed: false,
    pinchFrames: 0,
    wasPinch: false,
  };
  mirrorChk.addEventListener('change', ()=>{ state.mirror = mirrorChk.checked; });

  // ================= 称號 =================
  function getRank(score){ let cur = RANKS[0]; for(const r of RANKS){ if(score >= r.min) cur = r; else break; } return cur; }
  function getNextRank(score){ for(const r of RANKS){ if(score < r.min) return r; } return null; }
  function updateRankHUD(){
    const cur = getRank(state.score), nxt = getNextRank(state.score);
    rankNowEl.textContent = cur.title;
    rankNextEl.textContent = nxt ? `（距離「${nxt.title}」還差 ${nxt.min - state.score} 分）` : "（最高稱號）";
  }

  // ================= 工具 =================
  function rand(min,max){ return min + Math.random()*(max-min); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  // ================= 金魚（多魚種） =================
  function randFish(){
    const W=canvas.width, H=canvas.height;
    const t = FISH_TYPES[Math.floor(Math.random()*FISH_TYPES.length)];
    const r = rand(t.size[0], t.size[1]);
    const sp = (Math.random()*2+1) * t.speed;
    const a = Math.random()*Math.PI*2;
    return {
      type: t.key, hue: t.hue, score: t.score,
      x: Math.random()*W, y: Math.random()*H,
      vx: Math.cos(a)*sp*(Math.random()<.5?-1:1),
      vy: Math.sin(a)*sp,
      r, alive: true,
      tw: 0 // 閃爍用
    };
  }
  function ensureFishCount(n=TARGET_FISH_COUNT){ while(state.fish.length < n){ state.fish.push(randFish()); } }
  function respawnFish(f){ Object.assign(f, randFish()); }

  function fishSpeedMultiplier(){
    if(!state.startTs) return 1;
    const elapsed = (performance.now() - state.startTs)/1000;
    return 1 + elapsed * DIFF_SPEED_GROWTH_PER_SEC;
  }

  function drawFish(f, t){
    if(!f.alive) return;
    // 閃光魚：色相閃爍
    const hue = (f.type==='glow') ? (f.hue + Math.sin(f.tw*0.2)*50) : f.hue;
    ctx.beginPath();
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(f.x - f.r, f.y);
    ctx.quadraticCurveTo(f.x - f.r*2, f.y - f.r*0.6, f.x - f.r*0.8, f.y - f.r*0.2);
    ctx.quadraticCurveTo(f.x - f.r*2, f.y + f.r*0.6, f.x - f.r, f.y); ctx.fill();
    ctx.fillStyle = '#0b1220';
    ctx.beginPath(); ctx.arc(f.x + f.r*0.35, f.y - f.r*0.2, f.r*0.15, 0, Math.PI*2); ctx.fill();
    f.tw += 1;
  }

  function stepFish(){
    const W=canvas.width, H=canvas.height;
    const mul = fishSpeedMultiplier();
    for(const f of state.fish){
      if(!f.alive) continue;
      f.vx += (Math.random()-.5)*0.2;
      f.vy += (Math.random()-.5)*0.2;
      const speed = Math.hypot(f.vx, f.vy);
      const maxS = 2.8 * mul;
      if(speed>maxS){ f.vx = f.vx/speed*maxS; f.vy = f.vy/speed*maxS; }
      f.x += f.vx; f.y += f.vy;
      if(f.x<f.r){ f.x=f.r; f.vx=Math.abs(f.vx); }
      if(f.x>W-f.r){ f.x=W-f.r; f.vx=-Math.abs(f.vx); }
      if(f.y<f.r){ f.y=f.r; f.vy=Math.abs(f.vy); }
      if(f.y>H-f.r){ f.y=H-f.r; f.vy=-Math.abs(f.vy); }
      if(state.hand.pinch && state.hand.visible && !state.failed){
        const d = Math.hypot(f.x - state.hand.x, f.y - state.hand.y);
        if(d < state.hand.radius){
          state.score += f.score; state.hits += 1;
          damageNet(DECAY_PER_CATCH);
          popToast(`+${f.score} 🐟`); ping();
          respawnFish(f);
          updateRankHUD();
        }
      }
    }
  }

  // ================= 道具（寶箱） =================
  function maybeSpawnChest(dt){
    if(Math.random() < CHEST_SPAWN_PPS * dt) {
      const W=canvas.width, H=canvas.height;
      state.items.push({ type:'chest', x: Math.random()*W, y: Math.random()*H, r: 16, life: 8 }); // 8s 存在
    }
  }
  function stepItems(dt){
    for(const it of state.items){ it.life -= dt; }
    state.items = state.items.filter(it => it.life > 0);
    // 繪製 & 撈取
    for(const it of state.items){
      // 畫寶箱
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.fillStyle = '#c084fc';
      ctx.beginPath(); ctx.arc(0,0,it.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,it.r-5,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#1f2937'; ctx.font='bold 14px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🎁',0,1);
      ctx.restore();

      if(state.hand.pinch && state.hand.visible && !state.failed){
        const d = Math.hypot(it.x - state.hand.x, it.y - state.hand.y);
        if(d < state.hand.radius){
          // 觸發隨機效果
          const roll = Math.random();
          if(roll < 0.35){ // +8s
            state.tLeft = Math.min(999, state.tLeft + 8);
            hudTime.textContent = state.tLeft; timeEl.textContent = state.tLeft;
            popToast('+8s ⏱️');
          } else if(roll < 0.65){ // 修網 +0.2
            const before = state.durability;
            state.durability = clamp(state.durability + 0.2, 0, 1);
            durFill.style.width = `${state.durability*100}%`;
            popToast((state.durability>before)?'修網 +20% 🕸️':'修網已滿');
          } else if(roll < 0.85){ // +5 分
            state.score += 5; updateRankHUD(); popToast('+5 ⭐');
          } else { // -5 分
            state.score = Math.max(0, state.score - 5); updateRankHUD(); popToast('−5 ⚠️');
          }
          // 移除該寶箱
          it.life = 0;
        }
      }
    }
    state.items = state.items.filter(it => it.life > 0);
  }

  // ================= 障礙（泡泡、垃圾） =================
  function maybeSpawnObstacles(dt){
    if(Math.random() < BUBBLE_SPAWN_PPS * dt){
      const x = Math.random()*canvas.width;
      state.obstacles.push({ type:'bubble', x, y: canvas.height + 20, r: rand(8,16), vy: -rand(0.6,1.2), life: 10 });
    }
    if(Math.random() < TRASH_SPAWN_PPS * dt){
      const y = Math.random()*canvas.height;
      state.obstacles.push({ type:'trash', x: -20, y, r: 14, vx: rand(1.2,2.0), life: 12 });
    }
  }
  function stepObstacles(dt){
    for(const ob of state.obstacles){
      ob.life -= dt;
      if(ob.type==='bubble'){ ob.y += ob.vy; ob.x += Math.sin(ob.y*0.03)*0.3; }
      if(ob.type==='trash'){ ob.x += ob.vx; }
    }
    // 繪製 & 碰撞
    for(const ob of state.obstacles){
      if(ob.type==='bubble'){
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle='rgba(147,197,253,.8)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
        // 網碰到 -> 爆掉（純視覺）
        if(state.hand.visible){
          const d = Math.hypot(ob.x - state.hand.x, ob.y - state.hand.y);
          if(d < state.hand.radius + ob.r*0.6){ ob.life = 0; splash(ob.x, ob.y); }
        }
      }
      if(ob.type==='trash'){
        ctx.save();
        ctx.fillStyle='#64748b';
        ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#0b1220'; ctx.font='bold 12px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🗑️', ob.x, ob.y+1);
        ctx.restore();
        // 撈到 -> 扣分並扣耐久
        if(state.hand.pinch && state.hand.visible){
          const d = Math.hypot(ob.x - state.hand.x, ob.y - state.hand.y);
          if(d < state.hand.radius + ob.r*0.5){
            state.score = Math.max(0, state.score - 3); updateRankHUD();
            damageNet(0.05);
            popToast('−3 與損網 ⚠️');
            ob.life = 0;
          }
        }
      }
    }
    state.obstacles = state.obstacles.filter(o => o.life>0 && o.x < canvas.width+40 && o.y > -40);
  }

  // 小水花效果
  function splash(x,y){
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle='#93c5fd'; ctx.lineWidth=2;
    for(let i=0;i<3;i++){
      ctx.beginPath(); ctx.arc(x,y,8+i*6,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }

  // ================= 背景 =================
  function drawWaterBG(t){
    const W=canvas.width, H=canvas.height;
    const grad = ctx.createRadialGradient(W*0.5, H*0.2, 10, W*0.5, H*0.5, Math.max(W,H));
    grad.addColorStop(0, 'rgba(96,165,250,0.20)'); grad.addColorStop(1, 'rgba(30,64,175,0.08)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.globalAlpha = 0.06;
    for(let i=0;i<6;i++){ const r = (t*0.05 + i*60) % (Math.max(W,H));
      ctx.beginPath(); ctx.arc(W*0.5, H*0.45, r, 0, Math.PI*2);
      ctx.lineWidth = 2; ctx.strokeStyle = '#93c5fd'; ctx.stroke();
    }
    ctx.restore();
  }

  // ================= 撈網（完整/快破/已破） =================
  function netStage(){ if(state.durability > 0.66) return 'full'; if(state.durability > 0.15) return 'fragile'; return 'broken'; }
  function damageNet(amount){
    state.durability = Math.max(0, state.durability - amount);
    durFill.style.width = `${state.durability*100}%`;
    if(state.durability <= 0 && !state.failed){ state.failed = true; endGame(true); }
  }
  function drawHandNet(){
    if(!state.hand.visible) return;
    const stage = netStage(), {x,y} = state.hand, R = state.hand.radius;
    let ring = '#93c5fd', mesh = 'rgba(147,197,253,.25)'; if(stage==='fragile'){ ring='#f59e0b'; mesh='rgba(245,158,11,.25)'; } if(stage==='broken'){ ring='#ef4444'; mesh='rgba(239,68,68,.25)'; }
    ctx.save(); ctx.lineWidth = 3;
    if(stage==='broken'){
      const gS=-Math.PI*0.15, gE=Math.PI*0.45;
      ctx.beginPath(); ctx.strokeStyle=ring; ctx.arc(x,y,R,gE,gS,false); ctx.stroke();
      ctx.strokeStyle=mesh; for(let i=0;i<6;i++){ const a=gS+(gE-gS)*(i/5); const sx=x+Math.cos(a)*R, sy=y+Math.sin(a)*R;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+(Math.random()-0.5)*12, sy+18+Math.random()*12); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.strokeStyle=ring; ctx.arc(x,y,R,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=mesh; const step=10;
      for(let dx=-R; dx<=R; dx+=step){ const hh=Math.sqrt(Math.max(0,R*R-dx*dx)); ctx.beginPath(); ctx.moveTo(x+dx,y-hh); ctx.lineTo(x+dx,y+hh); ctx.stroke(); }
      for(let dy=-R; dy<=R; dy+=step){ const hh=Math.sqrt(Math.max(0,R*R-dy*dy)); ctx.beginPath(); ctx.moveTo(x-hh,y+dy); ctx.lineTo(x+hh,y+dy); ctx.stroke(); }
      if(stage==='fragile'){ ctx.strokeStyle='rgba(245,158,11,.6)'; for(let i=0;i<4;i++){ ctx.beginPath();
        ctx.moveTo(x+(Math.random()-0.5)*R*0.5, y+(Math.random()-0.5)*R*0.5);
        ctx.lineTo(x+(Math.random()-0.5)*R, y+(Math.random()-0.5)*R); ctx.stroke(); } }
    }
    ctx.beginPath(); ctx.fillStyle='#e5e7eb'; ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  // ================= 煙火系統（Canvas 粒子） =================
  const fireworks = { running:false, parts:[] };
  function launchFirework(){
    const W=fx.width, H=fx.height;
    const x = Math.random()*W*0.8 + W*0.1, y = Math.random()*H*0.2 + H*0.15;
    const color = `hsl(${Math.floor(Math.random()*360)}, 90%, 60%)`;
    const N = 120;
    for(let i=0;i<N;i++){
      const a = (Math.PI*2) * (i/N);
      fireworks.parts.push({
        x, y, vx: Math.cos(a)*(1.5+Math.random()*2.5), vy: Math.sin(a)*(1.5+Math.random()*2.5),
        life: 60 + Math.random()*20, color
      });
    }
  }
  function stepFireworks(){
    fxc.clearRect(0,0,fx.width,fx.height);
    if(!fireworks.running) return;
    if(Math.random() < 0.08) launchFirework();
    fxc.globalCompositeOperation = 'lighter';
    for(const p of fireworks.parts){
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= 1;
      fxc.globalAlpha = Math.max(0, p.life/80);
      fxc.beginPath(); fxc.fillStyle = p.color; fxc.arc(p.x, p.y, 2, 0, Math.PI*2); fxc.fill();
    }
    fireworks.parts = fireworks.parts.filter(p => p.life>0);
    requestAnimationFrame(stepFireworks);
  }
  function startFireworks(){ fireworks.running = true; fireworks.parts.length=0; stepFireworks(); }
  function stopFireworks(){ fireworks.running = false; fireworks.parts.length=0; fxc.clearRect(0,0,fx.width,fx.height); }

  // ================= 音效 & 提示 =================
  const ac = new (window.AudioContext||window.webkitAudioContext)();
  function ping(){ const o = ac.createOscillator(), g = ac.createGain(); o.connect(g).connect(ac.destination); o.frequency.value = 880; g.gain.value = 0.001;
    const now = ac.currentTime; g.gain.setTargetAtTime(0.06, now, 0.005); g.gain.setTargetAtTime(0.0001, now+0.1, 0.03); o.start(); o.stop(now+0.25); }
  function popToast(txt){ toast.textContent = txt; toast.style.display='block'; toast.style.opacity = '1';
    setTimeout(()=>{ toast.style.transition='opacity .6s'; toast.style.opacity='0'; setTimeout(()=>{toast.style.display='none'; toast.style.transition='';}, 600); }, 80); }

  // ================= 計時器 =================
  let timerId = null;
  function startTimer(){
    clearInterval(timerId);
    timerId = setInterval(()=>{
      if(!state.running) return;
      state.tLeft--; if(state.tLeft<0){ state.tLeft=0; endGame(false); }
      timeEl.textContent = state.tLeft; hudTime.textContent = state.tLeft;
    }, 1000);
  }

  // ================= 結算 =================
  function showResultModal(broken){
    const cur = getRank(state.score), nxt = getNextRank(state.score);
    rankNameEl.textContent = cur.title;
    resultTitle.textContent = broken ? "撈網破掉了！" : "時間到！";
    resultLine.textContent = `分數 ${state.score}｜稱號「${cur.title}」`;
    resultHint.textContent = nxt ? `再 ${nxt.min - state.score} 分升級「${nxt.title}」` : "已達最高稱號！";
    modalMask.style.display = 'flex';
    startFireworks();
  }
  function hideResultModal(){
    modalMask.style.display = 'none';
    stopFireworks();
  }
  async function downloadPoster(){
    const W = canvas.width, H = canvas.height;
    const off = document.createElement('canvas'); off.width=W; off.height=H;
    const oc = off.getContext('2d');

    oc.drawImage(canvas, 0, 0);
    const g = oc.createLinearGradient(0,0,0,H*0.6);
    g.addColorStop(0,'rgba(0,0,0,.65)'); g.addColorStop(1,'rgba(0,0,0,0)');
    oc.fillStyle = g; oc.fillRect(0,0,W,H*0.6);

    const cx = W*0.5, cy = H*0.22, R = Math.min(W,H)*0.12;
    const grd = oc.createConicGradient(0, cx, cy);
    ['#fef3c7','#fde68a','#facc15','#f59e0b','#fef3c7'].forEach((c,i)=>grd.addColorStop(i/4, c));
    oc.fillStyle = grd; oc.beginPath(); oc.arc(cx,cy,R,0,Math.PI*2); oc.fill();
    oc.fillStyle = 'rgba(255,255,255,.22)'; oc.beginPath(); oc.arc(cx,cy,R-10,0,Math.PI*2); oc.fill();
    oc.font = `bold ${Math.floor(R*0.38)}px system-ui`; oc.fillStyle = '#111827';
    const cur = getRank(state.score), nxt = getNextRank(state.score);
    const title = cur.title;
    const tw = oc.measureText(title).width;
    oc.fillText(title, cx - tw/2, cy + R*0.55);

    oc.textAlign = 'center';
    oc.fillStyle = '#e5e7eb';
    oc.font = `900 ${Math.floor(W*0.04)}px system-ui`;
    oc.fillText('遊戲結果', cx, cy + R + 60);
    oc.font = `600 ${Math.floor(W*0.03)}px system-ui`;
    oc.fillText(`分數 ${state.score}｜稱號「${cur.title}」`, cx, cy + R + 100);
    oc.font = `500 ${Math.floor(W*0.022)}px system-ui`;
    oc.fillStyle = '#cbd5e1';
    oc.fillText(nxt ? `再 ${nxt.min - state.score} 分升級「${nxt.title}」` : '已達最高稱號！', cx, cy + R + 130);

    const url = off.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `goldfish_${Date.now()}.png`; a.click();
  }

  function endGame(broken){
    state.running=false;
    showResultModal(broken);
  }

  function resetGame(){
    hideResultModal();
    state.score=0; state.hits=0; state.tLeft=60; state.durability=1.0; state.failed=false;
    state.pinchFrames = 0; state.wasPinch = false;
    scoreEl.textContent=0; hudHit.textContent=0; durFill.style.width = '100%';
    state.fish = []; state.items=[]; state.obstacles=[];
    ensureFishCount(TARGET_FISH_COUNT); updateRankHUD();
  }

  // ================= MediaPipe Hands =================
  let camera = null;
  const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({ maxNumHands:1, modelComplexity: 1, minDetectionConfidence:0.6, minTrackingConfidence:0.5 });
  hands.onResults(onHands);

  function onHands(results){
    const W = canvas.width, H = canvas.height;
    if(results.multiHandLandmarks && results.multiHandLandmarks.length>0){
      const lm = results.multiHandLandmarks[0];
      const i8 = lm[8], i4 = lm[4];
      const rawX = i8.x, rawY = i8.y;
      state.hand.x = (state.mirror ? (1 - rawX) : rawX) * W;
      state.hand.y = rawY * H;
      state.hand.visible = true;

      const tx8 = state.mirror ? (1 - i8.x) : i8.x;
      const tx4 = state.mirror ? (1 - i4.x) : i4.x;
      const dx = (tx8 - tx4) * W, dy = (i8.y - i4.y) * H;
      const dist = Math.hypot(dx, dy);
      const pinchThreshold = Math.min(W,H) * PINCH_THRESHOLD_RATIO;
      const isPinch = dist < pinchThreshold;

      if(isPinch){ state.pinchFrames++; }
      else {
        if(state.wasPinch){
          const excess = Math.max(0, state.pinchFrames - PINCH_GRACE_FRAMES);
          const decay  = Math.min(PINCH_MAX_DECAY, excess * DECAY_PER_PINCH_FRAME);
          if(decay > 0) damageNet(decay);
        }
        state.pinchFrames = 0;
      }
      state.wasPinch = isPinch;
      state.hand.pinch = isPinch;
      state.hand.radius = 40 + 40 * state.durability;
    } else {
      state.hand.visible = false;
      if(state.wasPinch){
        const excess = Math.max(0, state.pinchFrames - PINCH_GRACE_FRAMES);
        const decay  = Math.min(PINCH_MAX_DECAY, excess * DECAY_PER_PINCH_FRAME);
        if(decay > 0) damageNet(decay);
      }
      state.pinchFrames = 0; state.wasPinch = false;
    }
  }

  async function startCamera(){
    if(camera) return;
    camera = new Camera(video, { onFrame: async () => { await hands.send({image: video}); }, width: 640, height: 480 });
    await camera.start();
  }

  // ================= 主迴圈 =================
  function loop(ts){
    const now = performance.now();
    if(!state.startTs) state.startTs = now;
    const dt = Math.min(100, ts - state.lastTs) / 1000; // 秒
    const fps = 1 / (dt || 0.0167); state.fps = fps; state.lastTs = ts;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawWaterBG(ts);
    // 更新
    stepFish();
    maybeSpawnChest(dt);
    maybeSpawnObstacles(dt);
    stepItems(dt);
    stepObstacles(dt);
    // 繪製
    for(const f of state.fish) drawFish(f, ts);
    drawHandNet();

    scoreEl.textContent = state.score; hudHit.textContent = state.hits; fpsEl.textContent = state.fps.toFixed(0);
    if(state.running) requestAnimationFrame(loop);
  }

  // ================= 事件 =================
  btnStart.addEventListener('click', async ()=>{
    if(!state.running){
      mirrorChk.checked = true; state.mirror = true;
      resetGame();
      state.running = true; state.startTs = performance.now();
      requestAnimationFrame(loop);
      startTimer();
      await startCamera();
    }
  });
  btnReset.addEventListener('click', ()=>{ resetGame(); });
  btnAgain.addEventListener('click', ()=>{ resetGame(); state.running = true; state.startTs = performance.now(); requestAnimationFrame(loop); startTimer(); });
  btnClose.addEventListener('click', hideResultModal);
  btnShot.addEventListener('click', ()=> downloadPoster());

  // 初始
  resetGame();
})();
