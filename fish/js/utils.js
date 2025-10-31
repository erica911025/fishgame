// utils.js
// ✅ 常用小工具

export function rand(min,max){
  return min + Math.random()*(max-min);
}

export function clamp(val,min,max){
  return Math.max(min, Math.min(max,val));
}
