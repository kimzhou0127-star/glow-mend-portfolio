export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';

/** Only the selected, visible gallery may play; obsolete play promises cannot restart it. */
export class GalleryPlayback {
  private selected = false;
  private visible = false;
  private allowed = false;
  private foreground = true;
  private running = false;
  private disposed = false;
  private request = 0;
  constructor(private video: HTMLVideoElement, private status: (value: PlaybackStatus) => void) {
    video.loop = true;
    video.muted = false;
    video.volume = 1;
    video.addEventListener('playing', this.onPlaying);
    video.addEventListener('error', this.onError);
  }
  private get eligible() { return !this.disposed && this.selected && this.visible && this.allowed && this.foreground; }
  select(value: boolean) { this.selected = value; this.sync(); }
  show(value: boolean) { this.visible = value; this.sync(); }
  allow(value: boolean) { this.allowed = value; this.sync(); }
  focus(value: boolean) { this.foreground = value; this.sync(); }
  private stop() {
    this.request++;
    this.running = false;
    this.video.pause();
    this.video.currentTime = 0;
    if (!this.disposed) this.status('idle');
  }
  private sync() {
    if (!this.eligible) { this.stop(); return; }
    if (this.running) return;
    this.running = true;
    const request = ++this.request;
    this.video.currentTime = 0;
    this.video.muted = false;
    this.status('loading');
    this.video.play().catch(() => {
      if (request !== this.request || this.disposed) return;
      this.running = false;
      this.video.pause();
      this.status('error');
    });
  }
  private onPlaying = () => {
    if (!this.eligible) { this.stop(); return; }
    this.status('playing');
  };
  private onError = () => {
    this.stop();
    if (this.eligible) this.status('error');
  };
  retry() {
    if (!this.eligible) return;
    if (this.video.error) this.video.load();
    this.running = false;
    this.sync();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.video.removeEventListener('playing', this.onPlaying);
    this.video.removeEventListener('error', this.onError);
  }
}
