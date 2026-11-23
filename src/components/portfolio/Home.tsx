"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import data from "@/data/portfolio.json";
import gallery from "@/data/home-gallery.json";
import { useIntro } from "./SiteShell";
import { gsap, useGSAP } from "./motion";
import { clamp, damp, overlaps, projectCard, rotatePoint, spherePoints, type Box } from "./sphereGeometry";

// Interleave the roles without changing each image's explicit destination.
const items = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11].map(i => gallery[i]);
const points = spherePoints(items.length);
function CopyLines({ text }: { text: string }) {
  return text.split("\n").map((line, i) => <span className="sphere-copy-line" key={i} aria-hidden="true">{Array.from(line).map((char, j) => <span className="sphere-char" key={j}>{char}</span>)}</span>);
}
export function Home() {
  const ready = useIntro();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const [sound, setSound] = useState(false);
  const tickSound = () => {
    const ctx = audio.current;
    if (!soundEnabled.current || !ctx || ctx.state !== "running") return;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.frequency.setValueAtTime(900, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + .035);
    gain.gain.setValueAtTime(.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .045);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(); oscillator.stop(ctx.currentTime + .05);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };
  useGSAP(() => () => { soundEnabled.current = false; void audio.current?.close(); audio.current = null; }, { scope: root });
  useGSAP(() => {
    const area = stage.current, section = root.current;
    if (!ready || !area || !section) return;
    const cards = Array.from(area.querySelectorAll<HTMLAnchorElement>(".sphere-card"));
    const chars = Array.from(section.querySelectorAll<HTMLElement>(".sphere-char"));
    const lines = Array.from(section.querySelectorAll<HTMLElement>(".sphere-copy-line"));
    const copy = section.querySelector<HTMLElement>(".sphere-copy")!;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = preference.matches, disposed = false, dirty = true;
    let width = 1, height = 1, elapsed = 0, pitch = -.12, yaw = .35;
    let vx = 0, vy = 0, zoom = 1, targetZoom = 1, hover = -1, focused = -1;
    let lastSound = -Infinity;
    let drag: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean; time: number; target: HTMLElement } | null = null;
    let suppressClick = false;
    const loaded = cards.map(() => false), alpha = cards.map(() => 0), hoverAmount = cards.map(() => 0);
    const charAlpha = chars.map(() => 1);
    let letterBoxes: Box[] = [];
    const measure = () => {
      const bounds = area.getBoundingClientRect(); width = bounds.width; height = bounds.height;
      // Reads happen only after font/size changes and after the entrance settles.
      letterBoxes = chars.map(char => { const b = char.getBoundingClientRect(); return { x: b.left - bounds.left, y: b.top - bounds.top, width: b.width, height: b.height }; });
      cards.forEach((card, i) => {
        const box = projectCard(points[i], width, height, items[i].width / items[i].height, 1);
        card.style.width = `${box.width / box.scale}px`;
      });
      dirty = false;
    };
    cards.forEach((card, i) => {
      const image = card.querySelector("img")!;
      image.decode().then(() => { if (!disposed) loaded[i] = true; }).catch(() => {
        if (!disposed) { card.style.visibility = "hidden"; card.tabIndex = -1; }
      });
    });
    const observer = new ResizeObserver(() => { dirty = true; });
    observer.observe(area); observer.observe(copy);
    const fontsChanged = () => { if (!disposed) dirty = true; };
    void document.fonts.ready.then(fontsChanged);
    document.fonts.addEventListener("loadingdone", fontsChanged);
    const entrance = gsap.fromTo(lines, { y: reduced ? 0 : 12, opacity: 0 }, { y: 0, opacity: 1, duration: reduced ? 0 : .55, stagger: reduced ? 0 : .05, ease: "power2.out", onComplete: fontsChanged });
    const setHover = (event: PointerEvent) => {
      const card = (event.target as Element).closest<HTMLAnchorElement>(".sphere-card");
      const index = card ? cards.indexOf(card) : -1;
      if (index !== hover && index >= 0 && !drag && performance.now() - lastSound > 160) { tickSound(); lastSound = performance.now(); }
      hover = index;
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("button")) return;
      suppressClick = false;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, time: e.timeStamp, target: e.target as HTMLElement };
      vx = vy = 0;
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) { setHover(e); return; }
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8) drag.moved = true;
      if (drag.moved) {
        drag.target.setPointerCapture(e.pointerId);
        area.dataset.dragging = "true";
        const dx = (e.clientX - drag.x) * .003, dy = -(e.clientY - drag.y) * .003;
        yaw += dx; pitch += dy;
        const dt = clamp((e.timeStamp - drag.time) / 1000, .008, .05);
        vy = clamp(dx / dt, -2, 2); vx = clamp(dy / dt, -2, 2);
        hover = -1;
      }
      drag.x = e.clientX; drag.y = e.clientY; drag.time = e.timeStamp;
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      suppressClick = drag.moved;
      if (e.timeStamp - drag.time > 100 || reduced) vx = vy = 0;
      if (drag.target.hasPointerCapture(e.pointerId)) drag.target.releasePointerCapture(e.pointerId);
      drag = null; delete area.dataset.dragging;
    };
    const cancel = () => { if (drag?.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id); drag = null; vx = vy = 0; hover = -1; suppressClick = true; delete area.dataset.dragging; };
    const leave = () => { hover = -1; };
    const click = (e: MouseEvent) => { if (suppressClick && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); } suppressClick = false; };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); targetZoom = clamp(targetZoom * Math.exp(-e.deltaY * .001), .7, 1.4);
    };
    const focusIn = (e: FocusEvent) => { const card = (e.target as Element).closest<HTMLAnchorElement>(".sphere-card"); focused = card?.matches(":focus-visible") ? cards.indexOf(card) : -1; };
    const focusOut = () => { focused = -1; };
    const changePreference = () => { reduced = preference.matches; vx = vy = 0; };
    const visibility = () => { if (document.hidden) cancel(); else dirty = true; };
    const update = (_time: number, milliseconds: number) => {
      if (document.hidden) return;
      const dt = Math.min(milliseconds / 1000, .05); elapsed += dt;
      if (dirty) measure();
      if (!drag && focused < 0 && !reduced) {
        const speed = hover >= 0 ? .08 : 1;
        yaw += (Math.PI * 2 / 120 * speed + vy) * dt;
        pitch += (Math.PI * 2 / 480 * speed + vx) * dt;
        vx = damp(vx, 0, 4.8, dt); vy = damp(vy, 0, 4.8, dt);
      }
      zoom = damp(zoom, targetZoom, 10, dt);
      const boxes: Box[] = [];
      cards.forEach((card, i) => {
        hoverAmount[i] = damp(hoverAmount[i], hover === i || focused === i ? 1 : 0, 10, dt);
        const p = rotatePoint(points[i], pitch, yaw);
        const box = projectCard(p, width, height, items[i].width / items[i].height, zoom, hoverAmount[i]);
        const intro = reduced ? 1 : 1 - Math.pow(1 - clamp((elapsed - i * .025) / .85, 0, 1), 3);
        alpha[i] = damp(alpha[i], loaded[i] ? 1 : 0, 9, dt);
        const x = width / 2 + (box.x + box.width / 2 - width / 2) * intro;
        const y = height / 2 + (box.y + box.height / 2 - height / 2) * intro;
        card.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${box.scale * (.8 + .2 * intro)})`;
        card.style.opacity = String(alpha[i] * intro);
        card.style.zIndex = String(focused === i ? 40 : Math.round((p.z + 1) * 10));
        card.style.pointerEvents = alpha[i] > .5 ? "auto" : "none";
        if (alpha[i] > .5 && intro > .99) boxes.push(box);
      });
      if (elapsed < .9) return;
      chars.forEach((char, i) => {
        const hit = letterBoxes[i] && boxes.some(box => overlaps(letterBoxes[i], box));
        charAlpha[i] = damp(charAlpha[i], hit ? 0 : 1, hit ? 18 : 9, dt);
        char.style.opacity = String(charAlpha[i]);
      });
    };
    area.addEventListener("pointerdown", down); area.addEventListener("pointermove", move);
    area.addEventListener("pointerup", up); area.addEventListener("pointercancel", cancel);
    area.addEventListener("pointerleave", leave); area.addEventListener("click", click, true);
    area.addEventListener("wheel", wheel, { passive: false });
    area.addEventListener("focusin", focusIn); area.addEventListener("focusout", focusOut);
    window.addEventListener("pointerup", up); window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility); preference.addEventListener("change", changePreference);
    gsap.ticker.add(update);
    return () => {
      disposed = true; gsap.ticker.remove(update); entrance.kill(); observer.disconnect();
      area.removeEventListener("pointerdown", down); area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerup", up); area.removeEventListener("pointercancel", cancel);
      area.removeEventListener("pointerleave", leave); area.removeEventListener("click", click, true);
      area.removeEventListener("wheel", wheel); area.removeEventListener("focusin", focusIn); area.removeEventListener("focusout", focusOut);
      window.removeEventListener("pointerup", up); window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility); document.fonts.removeEventListener("loadingdone", fontsChanged); preference.removeEventListener("change", changePreference);
    };
  }, { scope: root, dependencies: [ready], revertOnUpdate: true });
  const toggleSound = async () => {
    try {
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume(); soundEnabled.current = !soundEnabled.current; setSound(soundEnabled.current);
    } catch { soundEnabled.current = false; setSound(false); }
  };
  return <section ref={root} className="home-hero sphere-home" aria-label="Glow Mend interactive gallery">
    <div ref={stage} className="sphere-stage" aria-label="Drag to rotate; Ctrl or Command + scroll to zoom">
      {items.map(item => <Link className="sphere-card" key={item.id} href={`/work/${item.slug}/`} aria-label={item.alt} data-image-id={item.id} draggable={false} onDragStart={e => e.preventDefault()}>
        <img src={item.src} alt={item.alt} width={item.width} height={item.height} draggable={false} decoding="async" />
      </Link>)}
    </div>
    <div className="sphere-copy">
      <h1 className="sphere-english" aria-label={data.profile.hero}><CopyLines text={data.profile.hero} /></h1>
      <p className="sphere-chinese" aria-label={data.profile.heroChinese}><CopyLines text={data.profile.heroChinese} /></p>
    </div>
    <button className="sound-toggle" aria-pressed={sound} onClick={toggleSound}><span aria-hidden="true">◖</span> Sound {sound ? "on" : "off"}</button>
    <span className="home-scroll-note">[ Drag to explore ]</span>
    <div className="hero-notes"><span>{data.copy.footerCopyright}</span><span>{data.copy.footerNote}</span><span className="footer-credit">{data.copy.footerCredit}</span></div>
  </section>;
}
