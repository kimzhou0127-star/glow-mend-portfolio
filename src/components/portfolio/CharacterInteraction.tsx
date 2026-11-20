"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "./motion";
import { useIntro } from "./SiteShell";
import { lookFrameForPointer, nearestLoopFrame, wrapFrame } from "./characterMotion";
import { LookAtlases, type AtlasConfig } from "./LookAtlases";

type InteractionConfig = AtlasConfig & {
  base: string; frameCount: number; fps: number; neutralFrame: number;
  width: number; height: number; icon: string; poster: string;
  iconStyle?: string;
  directions: { angle: number; frame: number }[];
  actions: { id: string; label: string; file: string; x: number; y: number }[];
};

export function CharacterInteraction({ config, active, name }: { config: InteractionConfig; active: boolean; name: string }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const atlases = useRef<LookAtlases | null>(null);
  const trigger = useRef<(index: number) => void>(() => {});
  const [visible, setVisible] = useState(false);
  const [mediaState, setMediaState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const ready = useIntro();
  useEffect(() => () => { atlases.current?.dispose(); atlases.current = null; }, []);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0].intersectionRatio >= 0.5), { threshold: [0, 0.5] });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useGSAP((_, contextSafe) => {
    const element = root.current;
    const surface = canvas.current;
    const context = surface?.getContext("2d", { alpha: false });
    if (!element || !surface || !context || !ready || !active || !visible || !contextSafe) return;
    const bank = atlases.current ??= new LookAtlases(config);
    let cancelled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = config.neutralFrame;
    let position = target;
    let drawn = -1;
    let bounds = element.getBoundingClientRect();
    let phase: "idle" | "loading" | "playing" | "returning" = "idle";
    let actionVideo: HTMLVideoElement | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let fade: gsap.core.Tween | undefined;
    const measure = () => { bounds = element.getBoundingClientRect(); };
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reduced) return;
      const desired = lookFrameForPointer(event.clientX, event.clientY, bounds, config);
      if (desired !== null) target = nearestLoopFrame(desired, position, config.frameCount);
    };
    const leave = () => { target = nearestLoopFrame(config.neutralFrame, position, config.frameCount); };
    const tick = (_time: number, delta: number) => {
      if (document.hidden) return;
      position += (target - position) * (1 - Math.exp(-Math.min(delta, 50) / 70));
      if ((phase === "idle" || phase === "returning") && Math.abs(drawn - position) > 0.01) {
        const frame = wrapFrame(position, config.frameCount);
        const lower = Math.floor(frame);
        bank.draw(context, lower);
        bank.draw(context, lower + 1, frame - lower);
        context.globalAlpha = 1;
        surface.style.opacity = "1";
        drawn = position;
      }
    };
    const finish = contextSafe(() => {
      if (!actionVideo || phase === "returning") return;
      clearTimeout(timeout);
      phase = "returning";
      drawn = -1;
      const video = actionVideo;
      video.pause();
      fade?.kill();
      fade = gsap.to(video, { opacity: 0, duration: reduced ? 0 : 0.35, onComplete: () => {
        video.currentTime = 0;
        phase = "idle";
        actionVideo = null;
        setBusy(null);
      } });
    });
    trigger.current = contextSafe((index: number) => {
      if (phase !== "idle" || document.hidden || !bank.ready) return;
      const video = videos.current[index];
      if (!video) return;
      phase = "loading";
      actionVideo = video;
      setBusy(config.actions[index].label);
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      video.onplaying = contextSafe(() => {
        if (actionVideo !== video || phase !== "loading") return;
        clearTimeout(timeout);
        phase = "playing";
        fade = gsap.to(video, { opacity: 1, duration: reduced ? 0 : 0.18 });
        timeout = setTimeout(finish, (Number.isFinite(video.duration) ? video.duration + 2 : 12) * 1000);
      });
      video.onended = finish;
      video.onerror = finish;
      timeout = setTimeout(finish, 8000);
      video.play().catch(finish);
    });
    const hide = () => { if (document.hidden) { leave(); finish(); } };
    const attach = () => {
      if (cancelled || !bank.ready) return;
      setMediaState("ready");
      bank.draw(context, config.neutralFrame);
      surface.style.opacity = "1";
      window.addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      window.addEventListener("scroll", measure, { passive: true });
      document.addEventListener("visibilitychange", hide);
      gsap.ticker.add(tick);
    };
    bank.prepare().then(attach).catch(() => { if (!cancelled) setMediaState("error"); });
    return () => {
      cancelled = true;
      trigger.current = () => {};
      clearTimeout(timeout);
      fade?.kill();
      resize.disconnect();
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("visibilitychange", hide);
      gsap.ticker.remove(tick);
      videos.current.forEach(video => {
        if (!video) return;
        video.onplaying = video.onended = video.onerror = null;
        video.pause(); video.currentTime = 0; video.style.opacity = "0";
      });
      setBusy(null);
    };
  }, { scope: root, dependencies: [active, visible, ready, config], revertOnUpdate: true });

  return <div className="character-interaction" ref={root} data-icon-style={config.iconStyle} data-busy={busy ? "true" : "false"} data-media-state={mediaState}>
    <div className="character-media-soft">
    <img className="character-rest" src={config.poster} alt={`${name}，移动鼠标与角色互动`} draggable={false} />
    <canvas ref={canvas} width={config.width} height={config.height} aria-hidden="true" />
    {config.actions.map((action, index) => <video key={action.id} ref={video => { videos.current[index] = video; }} src={active && visible && ready ? `${config.base}/${action.file}` : undefined} preload="auto" playsInline disablePictureInPicture aria-hidden="true" />)}
    </div>
    <div className="character-hotspots">
      {config.actions.map((action, index) => <button type="button" key={action.id} className="character-hotspot" style={{ left: `${action.x}%`, top: `${action.y}%` }} aria-label={action.label} title={action.label} disabled={!!busy || mediaState !== "ready" || !active || !visible || !ready} onClick={() => trigger.current(index)}>
        <img src={config.icon} alt="" draggable={false} />
      </button>)}
    </div>
    {mediaState === "loading" && <span className="character-media-status" role="status">正在准备互动…</span>}
    <span className="visually-hidden" aria-live="polite" role="status">{busy ? `${busy}，动作播放中` : "移动鼠标让角色转头，点击互动按钮触发动作"}</span>
  </div>;
}
