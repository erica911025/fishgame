// camera.js
// ✅ 啟動 MediaPipe Camera，將畫面交給 Hands 模組

import { onHandResults } from "./hand.js";

let camera = null;
let hands = null;

export function initHands() {
  hands = new Hands({
    locateFile: file => 
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5
  });
}

export async function startCamera(video, canvas) {
  if (!hands) initHands();

  hands.onResults(results => onHandResults(results, canvas));

  if (!camera) {
    camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 640,
      height: 480
    });
  }

  await camera.start();
}
