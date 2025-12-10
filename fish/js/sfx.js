export const sfx = {
  water: new Audio('sound/water.mp3'),
};

Object.values(sfx).forEach(a => {
  a.preload = 'auto';
  a.volume = 0.7;  // 可以依你喜好調整
});

export function play(name) {
  const a = sfx[name];
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(() => {});
}
