import { state } from './state.js';
import { onHandResults } from './hand.js';

const video = document.getElementById('video');

export async function startCamera(canvas){
  if(state.cameraStarted) return; state.cameraStarted=true;
  if(!window.Hands || !window.Camera){ console.warn('No MediaPipe, using mouse only.'); return; }


  const hands = new Hands({ locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
  hands.setOptions({ maxNumHands:1, modelComplexity: 1, minDetectionConfidence:.6, minTrackingConfidence:.5 });
  hands.onResults(res=>{
    onHandResults(res, canvas);
    // FPS 估算（粗略）
    state.fps = 60;
  });
  state.hands = hands;

  const cam = new Camera(video, {
    onFrame: async()=>{ await hands.send({ image: video }); },
    width: 640, height: 480
  });
  video.style.transform = state.mirror ? "scaleX(-1)" : "scaleX(1)";
  try{ await cam.start(); }catch(e){ console.warn('Camera denied, mouse-only mode.'); }
}
