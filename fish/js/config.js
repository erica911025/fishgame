// Adjustable parameters
export const TARGET_FISH_COUNT = 10;
export const GAME_TIME = 60;
export const COMBO_TIMEOUT = 3;
export const PINCH_THRESHOLD_RATIO = 0.06;
export const PINCH_GRACE_FRAMES = 8;

// High-DPI rendering
export const DPR_LIMIT = 2; // 2–3 recommended

// Fish / item assets
export const FISH_TYPES = [
  { key:'fish1',    img:'image/fish1.png',    score:1, speed:0.9,  size:[48,48] },
  { key:'fish2',    img:'image/fish2.png',    score:2, speed:1.05, size:[52,52] },
  { key:'fish3',    img:'image/fish3.png',    score:3, speed:1.2,  size:[54,54] },
  { key:'fish4',    img:'image/fish4.png',    score:4, speed:1.5,  size:[58,58] },
  { key:'shrimp1',  img:'image/shrimp1.png',  score:1, speed:0.9,  size:[56,56] },
  { key:'turtle3',  img:'image/turtle3.png',  score:3, speed:0.8,  size:[70,70] },
];

export const IMG_TIME = 'image/time.png';
export const IMG_TREASURE = 'image/treasure.png';

// Trash / penalty items
export const TRASH_TYPES = [
  { img:'image/trash-1.png', penalty:1 },
  { img:'image/trash-2.png', penalty:2 },
];

// Spawn rates (per second probability)
export const CHEST_SPAWN_PPS  = 0.15;
export const BUBBLE_SPAWN_PPS = 0.25;
export const TRASH_SPAWN_PPS  = 0.10;

// Rank definitions (English version)
export const RANKS = [
  { min: 0,  title: 'Rookie Catcher' },
  { min: 10, title: 'Fish Apprentice' },
  { min: 20, title: 'Skilled Angler' },
  { min: 35, title: 'Goldfish Master' },
  { min: 50, title: 'Legendary Hunter' },
];
