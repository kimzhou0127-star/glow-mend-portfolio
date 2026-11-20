"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import data from "@/data/portfolio.json";
import { Reveal } from "./Reveal";
import { useIntro } from "./SiteShell";
import { gsap, useGSAP } from "./motion";

export function Home() {
  const ready = useIntro();
  const ring = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const hover = useRef(-1);
  const input = useRef({ target: 0, position: 0, touchY: 0 });
  const audio = useRef<AudioContext | null>(null);
  const enabled = useRef(false);
  const [sound, setSound] = useState(false);
  const [phone, setPhone] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const projects = data.projects;
  const tickSound = () => {
    const context = audio.current;
    if (!enabled.current || !context || context.state !== "running") return;
    const time = context.currentTime;
    const noise = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 0.006),
      context.sampleRate,
    );
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) ** 4;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    filter.type = "highpass";
    filter.frequency.value = 3200;
    gain.gain.value = 0.55;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(time);
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.frequency.setValueAtTime(1300, time);
    tone.frequency.exponentialRampToValueAtTime(500, time + 0.012);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(0.275, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.016);
    tone.connect(envelope).connect(context.destination);
    tone.start(time);
    tone.stop(time + 0.03);
    tone.onended = () => {
      tone.disconnect();
      envelope.disconnect();
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  };
  useGSAP(() => {
    const media = matchMedia("(max-width: 809.98px)");
    const resize = () => setPhone(media.matches);
    resize();
    media.addEventListener("change", resize);
    return () => {
      media.removeEventListener("change", resize);
      audio.current?.close();
      audio.current = null;
    };
  }, []);
  useGSAP(
    () => {
      const element = ring.current;
      if (!element || !ready) return;
      let width = element.clientWidth,
        height = element.clientHeight;
      const observer = new ResizeObserver(() => {
        width = element.clientWidth;
        height = element.clientHeight;
      });
      observer.observe(element);
      const cards = gsap.utils.toArray<HTMLElement>(".ring-card");
      const marks = gsap.utils.toArray<HTMLElement>(".ring-mark");
      const count = cards.length;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const hoverProgress = cards.map(() => 0);
      let elapsed = reduced ? 2.6 : 0,
        lastIndex = -1,
        lastTick = 0;
      const update = (_time: number, deltaTime: number) => {
        if (document.hidden) return;
        const delta = Math.min(0.05, deltaTime / 1000);
        if (!reduced) elapsed += delta;
        input.current.position +=
          (input.current.target - input.current.position) *
          (1 - Math.exp(-delta * 2.5));
        const position = elapsed * 0.1 + input.current.position - count / 4;
        const tick = Math.floor(position);
        if (
          tick !== lastTick &&
          Math.abs(input.current.target - input.current.position) > 0.02
        )
          tickSound();
        lastTick = tick;
        const active =
          (((Math.round(position + count / 4) % count) + count) % count) %
          projects.length;
        if (active !== lastIndex && title.current) {
          title.current.textContent = `${projects[active].title}\n${projects[active].titleChinese}`;
          lastIndex = active;
        }
        const fractional =
          position + count / 4 - Math.floor(position + count / 4);
        marks.forEach((mark, i) => {
          const offset = i - 4 - fractional;
          const distance = Math.min(1, Math.abs(offset) / 4.5);
          gsap.set(mark, {
            y: offset * 9,
            width: Math.round(44 * (1 - 0.7 * distance)),
            opacity: Math.max(0, 1 - distance * distance),
          });
        });
        const raw = gsap.utils.clamp(0, 1, (elapsed - 0.5) / 0.75);
        const progress = raw * raw * (3 - 2 * raw);
        // Match the reference card footprint; retain the original ring spacing and timing.
        const cardWidth = phone ? 104 : 416,
          cardHeight = phone ? 58.5 : 234,
          gap = phone ? 24 : 63;
        const fit = Math.min(
          1,
          (width * (width < 600 ? 0.34 : width < 1100 ? 0.4 : 0.45)) /
            cardWidth,
          (height * 0.32) / cardHeight,
        );
        const baseRadius = (count * (cardHeight + gap)) / (2 * Math.PI);
        const initialScale = Math.min(
          fit * 0.5,
          (Math.min(width, height) * 0.42) / baseRadius,
        );
        const scale = initialScale + (fit - initialScale) * progress;
        const radius = baseRadius * scale,
          horizontalRadius = radius * 0.9;
        const w = cardWidth * scale,
          h = cardHeight * scale;
        const yaw = -30 + 14 * progress,
          pitch = 8 - 4 * progress;
        const centerX =
          width * 0.5 * (1 - progress) +
          (width * (width < 1100 ? 0.7 : 0.625) - horizontalRadius) * progress;
        cards.forEach((card, i) => {
          const angle = ((i - position) / count) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * horizontalRadius,
            y = Math.sin(angle) * radius;
          const depth =
            -x * Math.sin((yaw * Math.PI) / 180) +
            y * Math.sin((pitch * Math.PI) / 180);
          hoverProgress[i] +=
            ((hover.current === i && progress > 0.9 ? 1 : 0) -
              hoverProgress[i]) *
            (1 - Math.exp(-delta * 12));
          const amount = hoverProgress[i];
          const visible = gsap.utils.clamp(
            0,
            1,
            (Math.cos(angle) + 0.15) / 0.45,
          );
          card.style.width = `${w}px`;
          card.style.height = `${h}px`;
          // Preserve the source's transform order so each card shares the ring's perspective.
          card.style.transform = `translate3d(${centerX}px,${height / 2}px,0) rotateY(${yaw}deg) rotateX(${pitch}deg) translate3d(${x - w / 2}px,${y - h / 2}px,0) translate3d(${w / 2}px,${h / 2}px,0) rotateX(${-pitch * amount}deg) rotateY(${-yaw * amount}deg) translate3d(${-w / 2}px,${-h / 2}px,0)`;
          card.style.zIndex = String(
            10 + Math.round(1000 + depth) + (amount > 0.01 ? 2000 : 0),
          );
          card.style.opacity = String(1 - progress * (1 - visible));
          card.style.pointerEvents =
            visible > 0.15 || progress < 0.5 ? "auto" : "none";
        });
      };
      gsap.ticker.add(update);
      return () => {
        gsap.ticker.remove(update);
        observer.disconnect();
      };
    },
    { scope: ring, dependencies: [ready, phone], revertOnUpdate: true },
  );
  const toggleSound = async () => {
    if (!audio.current) audio.current = new AudioContext();
    await audio.current.resume();
    enabled.current = !enabled.current;
    setSound(enabled.current);
  };
  return (
    <section className="home-hero">
      <div className="home-introduction">
        <Reveal as="h1" className="home-lead" mode="lines">{data.profile.hero}</Reveal>
        <Reveal className="home-lead home-lead-chinese" mode="lines">{data.profile.heroChinese}</Reveal>
      </div>
      <div
        ref={ring}
        className="project-ring"
        onWheel={(e) => {
          input.current.target += e.deltaY * 0.006;
        }}
        onTouchStart={(e) => {
          input.current.touchY = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          const y = e.touches[0].clientY;
          input.current.target += (input.current.touchY - y) * 0.012;
          input.current.touchY = y;
        }}
      >
        {Array.from({ length: phone ? 14 : 18 }, (_, i) => {
          const project = projects[i % projects.length];
          return (
            <Link
              href={`/work/${project.slug}/`}
              key={i}
              className="ring-card"
              aria-label={project.title}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") hover.current = i;
              }}
              onPointerLeave={() => {
                hover.current = -1;
              }}
              onPointerDown={(e) => {
                pointer.current = { x: e.clientX, y: e.clientY };
              }}
              onClick={(e) => {
                if (
                  Math.hypot(
                    e.clientX - pointer.current.x,
                    e.clientY - pointer.current.y,
                  ) > 12 &&
                  e.detail !== 0
                )
                  e.preventDefault();
              }}
            >
              <img src={project.cover} alt={project.title} draggable={false} />
            </Link>
          );
        })}
        <div className="ring-indicator" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="ring-mark" />
          ))}
          <span className="ring-title" ref={title}>
            {`${projects[0].title}\n${projects[0].titleChinese}`}
          </span>
        </div>
        <button
          className="sound-toggle"
          aria-pressed={sound}
          onClick={toggleSound}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <path d="M2.5 6h2.2L8 3.3v9.4L4.7 10H2.5z" fill="currentColor" />
            {sound ? (
              <path d="M10.3 6.2a2.5 2.5 0 010 3.6M12 4.6a4.8 4.8 0 010 6.8" />
            ) : (
              <path d="m10.5 6 3 4m0-4-3 4" />
            )}
          </svg>
          Sound {sound ? "on" : "off"}
        </button>
      </div>
      <span className="home-scroll-note">[ Scroll ]</span>
      <div className="hero-notes">
        <span>{data.copy.footerCopyright}</span>
        <span>{data.copy.footerNote}</span>
        <span className="footer-credit">{data.copy.footerCredit}</span>
      </div>
    </section>
  );
}
