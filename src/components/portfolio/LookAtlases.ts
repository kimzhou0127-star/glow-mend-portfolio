import { wrapFrame } from "./characterMotion";
export type AtlasConfig = {
  base: string; frameCount: number; width: number; height: number;
  atlas: { directory: string; columns: number; rows: number; count: number };
};
/** Four complete decoded atlases. No fetching, decoding or eviction in the render loop. */
export class LookAtlases {
  readonly decodedBytes: number;
  private images: ImageBitmap[] = [];
  private controller = new AbortController();
  private pending: Promise<void> | null = null;
  private disposed = false;
  private failed = false;
  ready = false;
  constructor(private config: AtlasConfig) {
    const { width, height, atlas } = config;
    this.decodedBytes = width * height * atlas.columns * atlas.rows * atlas.count * 4;
    if (this.decodedBytes > 240 * 1024 * 1024) throw new Error("Look atlas exceeds decoded pixel budget");
  }
  prepare() {
    if (this.pending) return this.pending;
    this.pending = Promise.all(Array.from({ length: this.config.atlas.count }, async (_, index) => {
      const response = await fetch(`${this.config.base}/${this.config.atlas.directory}/atlas-${index}.webp`, { signal: this.controller.signal });
      if (!response.ok) throw new Error(`Look atlas ${index}: ${response.status}`);
      const bitmap = await createImageBitmap(await response.blob());
      if (this.disposed || this.failed) { bitmap.close(); return; }
      const { width, height, atlas } = this.config;
      if (bitmap.width !== width * atlas.columns || bitmap.height !== height * atlas.rows) {
        bitmap.close(); throw new Error("Unexpected look atlas dimensions");
      }
      this.images[index] = bitmap;
    })).then(() => { this.ready = !this.disposed && !this.failed; }).catch(error => {
      this.failed = true;
      this.controller.abort();
      this.images.forEach(image => image.close());
      this.images = [];
      throw error;
    });
    return this.pending;
  }
  draw(context: CanvasRenderingContext2D, frame: number, opacity = 1) {
    if (!this.ready) return;
    const { width, height, frameCount, atlas } = this.config;
    const index = Math.floor(wrapFrame(frame, frameCount));
    const perAtlas = atlas.columns * atlas.rows;
    const image = this.images[Math.floor(index / perAtlas)];
    context.globalAlpha = opacity;
    context.drawImage(image, (index % atlas.columns) * width, Math.floor((index % perAtlas) / atlas.columns) * height, width, height, 0, 0, width, height);
  }
  dispose() {
    this.disposed = true;
    this.ready = false;
    this.controller.abort();
    this.images.forEach(image => image.close());
    this.images = [];
  }
}
