// 可調參數
export const TARGET_FISH_COUNT = 10;
export const GAME_TIME = 60;
export const COMBO_TIMEOUT = 3;
export const PINCH_THRESHOLD_RATIO = 0.06;
export const PINCH_GRACE_FRAMES = 6;
export const DECAY_PER_PINCH_FRAME = 0.010;
export const PINCH_MAX_DECAY = 0.18;
export const DECAY_PER_CATCH = 0.08;

// 高畫質：會依 DPR 放大
export const DPR_LIMIT = 2; // 2~3 之間都可

// 魚/道具素材
export const FISH_TYPES = [
  { key:'fish1', img:'image/fish1.png', score:1, speed:0.9,  size:[48,48] },
  { key:'fish2', img:'image/fish2.png', score:2, speed:1.05, size:[52,52] },
  { key:'fish3', img:'image/fish3.png', score:3, speed:1.2,  size:[54,54] },
  { key:'fish4', img:'image/fish4.png', score:4, speed:1.5, size:[58,58] },
  { key:'shrimp1', img:'image/shrimp1.png', score:1, speed:0.9, size:[56,56] },
  { key:'turtle3', img:'image/turtle3.png', score:3, speed:0.8, size:[70,70] },
];

export const IMG_TIME = 'image/time.png';
export const IMG_TREASURE = 'image/treasure.png';

export const TRASH_TYPES = [
  { img:'image/trash-1.png', penalty:1 },
  { img:'image/trash-2.png', penalty:2 },
];

export const CHEST_SPAWN_PPS = 0.15;
export const BUBBLE_SPAWN_PPS = 0.25;
export const TRASH_SPAWN_PPS  = 0.10;

export const RANKS = [
  { min:0,  title:'新手撈手' },
  { min:10, title:'撈魚學徒' },
  { min:20, title:'撈魚高手' },
  { min:35, title:'撈金魚達人' },
  { min:50, title:'金魚界傳奇' },
];
