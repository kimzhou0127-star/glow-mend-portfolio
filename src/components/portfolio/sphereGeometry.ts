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
export function projectCard(p: Point3, width: number, height: number, aspect: number, zoom: number, hover = 0, index = 0): Box & { scale: number; depth: number } {
  // Preserve the approved image size while expanding only the movement field.
  const mobile = width < 810;
  const unit = Math.min((width - (mobile ? 16 : 36)) / 1440, (height - (mobile ? 220 : 190)) / 700);
  const baseWidth = (aspect > 1 ? 310 : 185) * unit * (2 / 1.5);
  const perspective = 1 / (1 - p.z * .28);
  const scale = perspective * zoom * (1 + .035 * hover);
  const w = baseWidth * scale, h = w / aspect;
  // Slightly open up the original compact orbit; keep the full-screen boundary.
  const originalWidth = width - (mobile ? 16 : 36);
  const originalHeight = height - (mobile ? 220 : 190);
  const radiusX = (originalWidth / 2 - 225 * unit) * .88 * 1.08;
  const radiusY = (originalHeight / 2 - 180 * unit) * .88 * 1.08;
  const x = width / 2 + p.x * radiusX * perspective + Math.sin(index * 2.4) * width * .008;
  const y = height / 2 + p.y * radiusY * perspective + Math.cos(index * 1.7) * height * .012;
  return { x: clamp(x, 0, width) - w / 2, y: clamp(y, 0, height) - h / 2, width: w, height: h, scale, depth: p.z };
}
export function overlaps(a: Box, b: Box, padding = 8) {
  return a.x < b.x + b.width + padding && a.x + a.width > b.x - padding && a.y < b.y + b.height + padding && a.y + a.height > b.y - padding;
}

// Paint only the glyph pixels covered by an image white; uncovered text keeps its color.
export function textImageBackground(text: Box, images: Box[], color: string) {
  const layers = images.filter(image => overlaps(text, image, 0)).map(image =>
    `linear-gradient(#fff,#fff) ${image.x - text.x}px ${image.y - text.y}px / ${image.width}px ${image.height}px no-repeat`);
  return [...layers, `linear-gradient(${color},${color})`].join(',');
}
