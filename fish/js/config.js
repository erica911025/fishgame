// config.js
// ✅ 本檔負責：遊戲可調參數 / 常數設定

// 手勢判定
export const PINCH_THRESHOLD_RATIO = 0.06;  
export const PINCH_GRACE_FRAMES = 6;
export const DECAY_PER_PINCH_FRAME = 0.010;
export const PINCH_MAX_DECAY = 0.18;
export const DECAY_PER_CATCH = 0.08;

// 場上魚數
export const TARGET_FISH_COUNT = 10;

// 魚種設定
export const FISH_TYPES = [
  { key:'red',  hue: 10,  score:1, speed:1.00, size:[16,24] },
  { key:'gold', hue: 38,  score:3, speed:1.25, size:[16,24] },
  { key:'glow', hue:200, score:5, speed:1.65, size:[12,18] },
];

// 道具/障礙機率
export const CHEST_SPAWN_PPS  = 0.15;
export const BUBBLE_SPAWN_PPS = 0.25;
export const TRASH_SPAWN_PPS  = 0.10;

// 难度速度成長
export const DIFF_SPEED_GROWTH_PER_SEC = 0.006;

// 稱號段位
export const RANKS = [
  { min:0, title:"新手撈手" },
  { min:10, title:"撈魚學徒" },
  { min:20, title:"撈魚高手" },
  { min:35, title:"撈金魚達人" },
  { min:50, title:"金魚界傳奇" }
];
