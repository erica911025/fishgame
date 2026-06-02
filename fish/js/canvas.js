import { state } from './state.js';
import { DPR_LIMIT } from './config.js';

export function setupCanvasSize(canvas){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  state.dpr = dpr;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height= Math.round(rect.height* dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0); // CSS座標繪製，高畫質
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}
