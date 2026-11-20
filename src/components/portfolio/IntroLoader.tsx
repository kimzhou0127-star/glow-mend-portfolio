"use client";

import { useRef } from "react";
import data from "@/data/portfolio.json";
import { gsap, useGSAP } from "./motion";

const sessionKey = "theo-video-intro-v2";

export function IntroLoader({ onReady }: { onReady: () => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const runner = useRef<HTMLImageElement>(null);
  const runnerPosition = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const progressbar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const element = overlay.current;
    const background = video.current;
    if (!element || !background) return;
    let seen = false;
    try { seen = sessionStorage.getItem(sessionKey) === "1"; } catch { /* Optional session cache. */ }
    const replay = new URLSearchParams(location.search).get("intro") === "replay";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ((seen && !replay) || reduced) {
      gsap.set(element, { display: "none" });
      onReady();
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    let active = true;
    let complete = false;
    let settled = 0;
    let displayed = 0;
    let lastNumber = -1;
    const started = performance.now();
    const disposers: (() => void)[] = [];
    const preloadImages: HTMLImageElement[] = [];
    const urls = [...new Set([
      ...data.projects.map(project => project.cover),
      ...Array.from(document.querySelectorAll<HTMLImageElement>("main img"), image => image.src),
    ])];
    const total = urls.length + 3; // Images, font readiness, runner, and background first frame.
    const markReady = () => { if (active) settled++; };

    for (const url of urls) {
      const image = new Image();
      image.src = url;
      preloadImages.push(image);
      image.decode().catch(() => undefined).then(markReady);
    }
    document.fonts.ready.then(markReady);
    if (runner.current) {
      runner.current.src = "/assets/intro/runner-v2.webp";
      runner.current.decode().catch(() => undefined).then(markReady);
    }

    let videoSettled = false;
    const settleVideo = () => {
      if (videoSettled) return;
      videoSettled = true;
      markReady();
    };
    background.addEventListener("loadeddata", settleVideo, { once: true });
    background.addEventListener("error", settleVideo, { once: true });
    disposers.push(() => {
      background.removeEventListener("loadeddata", settleVideo);
      background.removeEventListener("error", settleVideo);
    });
    background.src = "/assets/intro/background-v2.mp4";
    background.load();
    background.muted = false;
    background.volume = 1;
    background.play().catch(() => {
      if (!active) return;
      background.muted = true;
      background.play().catch(settleVideo);
    });

    const exit = gsap.timeline({ paused: true });
    exit.to(".intro-progress", { opacity: 0, y: -12, duration: 0.28, ease: "power2.in" })
      .call(() => {
        onReady();
        try { sessionStorage.setItem(sessionKey, "1"); } catch { /* Optional session cache. */ }
      }, [], 0.12)
      .to(element, { yPercent: -100, duration: 1.1, ease: "portfolioLift" }, 0.12)
      .call(() => {
        background.pause();
        document.documentElement.style.overflow = previousOverflow;
      })
      .set(element, { display: "none" });

    const update = (_time: number, delta: number) => {
      if (complete) return;
      const elapsed = (performance.now() - started) / 1000;
      // Resource readiness controls completion; a minimum duration lets the opening breathe.
      // A bounded fallback releases the page if a resource cannot finish loading.
      const resourcesReady = settled >= total || elapsed >= 12;
      const target = Math.min(elapsed / 2.6 * 100, resourcesReady ? 100 : Math.min(94, settled / total * 100));
      displayed += (target - displayed) * (1 - Math.exp(-Math.min(delta, 100) / 160));
      if (target === 100 && displayed > 99.8) displayed = 100;
      const number = Math.floor(displayed);
      if (count.current && number !== lastNumber) {
        count.current.textContent = String(number).padStart(3, "0");
        progressbar.current?.setAttribute("aria-valuenow", String(number));
        lastNumber = number;
      }
      if (fill.current) fill.current.style.transform = `scaleX(${displayed / 100})`;
      // The 100%-wide wrapper moves with a transform, avoiding layout work on every frame.
      if (runnerPosition.current) runnerPosition.current.style.transform = `translateX(${displayed}%)`;
      if (displayed === 100) {
        complete = true;
        exit.delay(0.25).play();
      }
    };
    gsap.ticker.add(update);
    return () => {
      active = false;
      gsap.ticker.remove(update);
      disposers.forEach(dispose => dispose());
      preloadImages.forEach(image => { image.onload = null; image.onerror = null; });
      background.pause();
      background.removeAttribute("src");
      background.load();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, { scope: overlay });

  return (
    <div ref={overlay} className="intro-loader">
      <video ref={video} className="intro-background" playsInline loop preload="auto" poster="/assets/intro/poster-v2.webp" aria-hidden="true" />
      <div className="intro-shade" />
      <div className="intro-progress">
        <div className="intro-track-area">
          <div className="intro-runner-position" ref={runnerPosition}>
            {/* Animated WebP preserves transparency across desktop browsers. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={runner} className="intro-runner" alt="" width="444" height="233" />
          </div>
          <div ref={progressbar} className="intro-track" role="progressbar" aria-label="Loading portfolio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
            <div ref={fill} className="intro-fill" />
          </div>
        </div>
        <div className="intro-number" aria-hidden="true"><span ref={count}>000</span><span className="intro-percent">%</span></div>
      </div>
    </div>
  );
}
