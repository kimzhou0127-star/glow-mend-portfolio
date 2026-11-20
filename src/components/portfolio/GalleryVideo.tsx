"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { GalleryPlayback, type PlaybackStatus } from './galleryPlayback';
import { useIntro } from './SiteShell';

export type GalleryVideoHandle = { select: (selected: boolean) => void };
export const GalleryVideo = forwardRef<GalleryVideoHandle, {
  src: string; poster: string; active: boolean; name: string;
}>(function GalleryVideo({ src, poster, active, name }, forwardedRef) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const playback = useRef<GalleryPlayback | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const ready = useIntro();
  useImperativeHandle(forwardedRef, () => ({ select: selected => playback.current?.select(selected) }), []);
  useEffect(() => {
    if (!root.current || !video.current) return;
    const controller = new GalleryPlayback(video.current, setStatus);
    playback.current = controller;
    const visibility = () => controller.focus(!document.hidden);
    visibility();
    const observer = new IntersectionObserver(entries => controller.show(entries[0].intersectionRatio > 0.5), { threshold: [0, 0.5, 0.51] });
    observer.observe(root.current);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      controller.dispose();
      playback.current = null;
    };
  }, [src]);
  useEffect(() => { playback.current?.allow(ready); }, [ready, src]);
  useEffect(() => { playback.current?.select(active); }, [active, src]);
  return <div ref={root} className="gallery-video">
    <video ref={video} src={src} poster={poster} preload="auto" playsInline loop disablePictureInPicture aria-label={`${name}展示视频`} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {status !== 'playing' && <img src={poster} alt={`${name}展示视频首帧`} draggable={false} />}
    {status === 'error' && active && <button className="gallery-video-retry" type="button" onClick={() => playback.current?.retry()}>点击播放</button>}
  </div>;
});
