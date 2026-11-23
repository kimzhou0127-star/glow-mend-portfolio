export type Point3 = { x: number; y: number; z: number };
export type Box = { x: number; y: number; width: number; height: number };
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const damp = (current: number, target: number, rate: number, dt: number) => target + (current - target) * Math.exp(-rate * dt);

export function spherePoints(count: number): Point3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - 2 * (i + .5) / count;
    const radius = Math.sqrt(1 - y * y);
    return { x: Math.cos(i * golden) * radius, y, z: Math.sin(i * golden) * radius };
  });
}
export function rotatePoint(p: Point3, pitch: number, yaw: number): Point3 {
  const y = p.y * Math.cos(pitch) - p.z * Math.sin(pitch);
  const z = p.y * Math.sin(pitch) + p.z * Math.cos(pitch);
  return { x: p.x * Math.cos(yaw) + z * Math.sin(yaw), y, z: -p.x * Math.sin(yaw) + z * Math.cos(yaw) };
}
export function projectCard(p: Point3, width: number, height: number, aspect: number, zoom: number, hover = 0): Box & { scale: number; depth: number } {
  const unit = Math.min(width / 1440, height / 700);
  const baseWidth = (aspect > 1 ? 310 : 185) * unit;
  const perspective = 1 / (1 - p.z * .28);
  const scale = perspective * zoom * (1 + .035 * hover);
  const w = baseWidth * scale, h = w / aspect;
  // The elliptical projection keeps the whole card below navigation and above the footer.
  const x = width / 2 + p.x * (width / 2 - 225 * unit) * perspective * .88;
  const y = height / 2 + p.y * (height / 2 - 180 * unit) * perspective * .88;
  return { x: clamp(x - w / 2, 6, Math.max(6, width - w - 6)), y: clamp(y - h / 2, 6, Math.max(6, height - h - 6)), width: w, height: h, scale, depth: p.z };
}
export function overlaps(a: Box, b: Box, padding = 8) {
  return a.x < b.x + b.width + padding && a.x + a.width > b.x - padding && a.y < b.y + b.height + padding && a.y + a.height > b.y - padding;
}
