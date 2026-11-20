/** Ordered samples from the original orbit. Frames are unwrapped across its seam. */
export type DirectionConfig = {
  frameCount: number;
  directions: { angle: number; frame: number }[];
};
export function wrapFrame(frame: number, count: number) {
  return ((frame % count) + count) % count;
}
export function nearestLoopFrame(frame: number, current: number, count: number) {
  return current + wrapFrame(frame - current + count / 2, count) - count / 2;
}
export function lookFrameForPointer(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, config: DirectionConfig) {
  const dx = x - (rect.left + rect.width * 0.5);
  const dy = y - (rect.top + rect.height * 0.22);
  // Hold the previous direction near the head; atan2 is unstable at the origin.
  if (Math.hypot(dx, dy) < Math.max(16, rect.width * 0.035)) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const next = config.directions.findIndex(point => point.angle >= angle);
  if (next <= 0) return wrapFrame(config.directions[0].frame, config.frameCount);
  const a = config.directions[next - 1], b = config.directions[next];
  return wrapFrame(a.frame + (b.frame - a.frame) * (angle - a.angle) / (b.angle - a.angle), config.frameCount);
}
