import { FISH_TYPES, IMG_TIME, IMG_TREASURE, TRASH_TYPES } from './config.js';

export const ASSETS = {
  fish:{}, time:null, treasure:null, trash:[]
};

export function loadAssets(){
  // fish
  FISH_TYPES.forEach(t=>{
    const img = new Image(); img.src = t.img;
    ASSETS.fish[t.key] = img;
  });
  // time & treasure
  ASSETS.time = new Image(); ASSETS.time.src = IMG_TIME;
  ASSETS.treasure = new Image(); ASSETS.treasure.src = IMG_TREASURE;
  // trash
  ASSETS.trash = TRASH_TYPES.map(t=>{ const a=new Image(); a.src=t.img; return a; });
}
