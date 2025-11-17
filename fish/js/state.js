export const state = {
  running:false,
  score:0, hits:0,
  comboCount:0,   // 目前連續撈到幾隻
  comboTime:0,    // 連擊還能維持幾秒
  maxCombo:0,     // 這一局最高連擊
  tLeft:60, fps:0,
  durability:1, failed:false,
  fish:[], items:[], obstacles:[],
  hand:{ x:0,y:0, radius:60, pinch:false, visible:false, speed: 0 },
  pinchFrames:0, wasPinch:false,
  missStreak: 0,        // 連續沒撈中的次數
  caughtThisPinch: false, // 這一次「捏網」過程中有沒有撈到魚
  lastMissTime: 0,   //  最近一次 miss 是在第幾秒發生
  // devices
  dpr: 1,
  mirror: true,
  cameraStarted:false,
  hands:null,
  dx: 0,
  dy: 0
};
