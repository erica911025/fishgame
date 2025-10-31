// state.js
// ✅ 遊戲全局狀態，其他模組 import 使用

export const state = {
  running:false,
  score:0,
  hits:0,
  tLeft:60,

  lastTs: performance.now(),
  startTs: null,
  fps: 0,

  durability: 1.0, // 撈網耐久
  fish: [],
  items: [],
  obstacles: [],

  mirror: true,

  hand: {
    pinch:false,
    x:0,
    y:0,
    visible:false,
    radius:50
  },

  failed:false,
  pinchFrames:0,
  wasPinch:false
};
