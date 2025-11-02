export const state = {
  running:false,
  score:0, hits:0,
  tLeft:60, fps:0,
  durability:1, failed:false,

  fish:[], items:[], obstacles:[],
  hand:{ x:0,y:0, radius:60, pinch:false, visible:false, speed: 0 },
  pinchFrames:0, wasPinch:false,

  // devices
  dpr: 1,
  mirror: true,
  cameraStarted:false,
  hands:null,
  dx: 0,
  dy: 0
};
