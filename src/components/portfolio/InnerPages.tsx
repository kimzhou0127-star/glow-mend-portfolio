"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import data from "@/data/portfolio.json";
import { Reveal } from "./Reveal";
import { CharacterInteraction } from "./CharacterInteraction";
import { GalleryVideo, type GalleryVideoHandle } from "./GalleryVideo";
import { SiteFooter, useIntro } from "./SiteShell";
import { gsap, useGSAP, ScrollTrigger } from "./motion";

type Project = (typeof data.projects)[number];

export function WorkPage() {
  const strip = useRef<HTMLDivElement>(null);
  const ready = useIntro();
  useGSAP(
    () => {
      const element = strip.current;
      if (!element || !ready) return;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const group = () =>
        element.querySelectorAll<HTMLElement>(".work-card")[24];
      const distance = () =>
        (group()?.offsetLeft || 0) -
        (element.querySelector<HTMLElement>(".work-card")?.offsetLeft || 0);
      let position = element.scrollLeft;
      let touching = false;
      const drag = { active: false, x: 0, start: 0, moved: false };
      const wrap = () => {
        const span = distance();
        if (!span) return;
        if (position >= span) position -= span;
        if (position < 0) position += span;
        element.scrollLeft = position;
      };
      const wheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
          event.preventDefault();
          position += event.deltaX;
          wrap();
        }
      };
      const update = (_time: number, delta: number) => {
        if (document.hidden || touching || drag.active) return;
        if (Math.abs(element.scrollLeft - position) > 2)
          position = element.scrollLeft;
        if (!reduced) position += Math.min(delta, 50) * 0.04;
        wrap();
      };
      const down = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        drag.active = true;
        drag.moved = false;
        drag.x = event.clientX;
        drag.start = element.scrollLeft;
      };
      const move = (event: PointerEvent) => {
        if (!drag.active) return;
        const difference = event.clientX - drag.x;
        if (Math.abs(difference) > 4) drag.moved = true;
        position = drag.start - difference;
        wrap();
      };
      const up = () => {
        drag.active = false;
      };
      const click = (event: MouseEvent) => {
        if (drag.moved) {
          event.preventDefault();
          event.stopPropagation();
          drag.moved = false;
        }
      };
      const preventDrag = (event: DragEvent) => event.preventDefault();
      const touchStart = () => {
        touching = true;
      };
      const touchEnd = () => {
        touching = false;
        position = element.scrollLeft;
      };
      element.addEventListener("wheel", wheel, { passive: false });
      element.addEventListener("pointerdown", down);
      element.addEventListener("click", click, true);
      element.addEventListener("dragstart", preventDrag);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      element.addEventListener("touchstart", touchStart, { passive: true });
      element.addEventListener("touchend", touchEnd, { passive: true });
      gsap.ticker.add(update);
      gsap.from(element, {
        opacity: 0,
        y: 24,
        duration: 0.9,
        delay: 0.15,
        ease: "portfolioReveal",
      });
      return () => {
        gsap.ticker.remove(update);
        element.removeEventListener("wheel", wheel);
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("click", click, true);
        element.removeEventListener("dragstart", preventDrag);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        element.removeEventListener("touchstart", touchStart);
        element.removeEventListener("touchend", touchEnd);
      };
    },
    { scope: strip, dependencies: [ready], revertOnUpdate: true },
  );
  // Repeating the three projects preserves the source's continuous browsing strip.
  const repeated = Array.from(
    { length: 48 },
    (_, i) => data.projects[i % data.projects.length],
  );
  return (
    <>
      <section className="work-index">
        <div className="work-title">
          <Reveal as="h1" className="display-title wide-title" mode="scramble">{data.copy.workTitle[0]}<br />{data.copy.workTitle[1]}</Reveal>
          <Reveal as="h1" className="display-title phone-title" mode="scramble">{data.copy.workTitle[0]}<br />{data.copy.workTitle[1]}</Reveal>
        </div>
        <div
          ref={strip}
          className="work-strip"
          data-lenis-prevent
          aria-label="Projects"
          tabIndex={0}
        >
          {repeated.map((project, i) => (
            <Link className="work-card" href={`/work/${project.slug}/`} key={i}>
              <span className="work-card-name"><strong>{project.title}</strong><span>{project.titleChinese}</span></span>
              <div className="work-image">
                <img
                  src={project.workCover}
                  alt={project.title}
                  draggable={false}
                />
              </div>
            </Link>
          ))}
        </div>
        <SiteFooter />
      </section>
    </>
  );
}

function CharacterGallery({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const direction = useRef(1);
  const galleryVideo = useRef<GalleryVideoHandle>(null);
  const change = (step: number) => {
    direction.current = step;
    const next = (index + step + project.images.length) % project.images.length;
    ref.current?.querySelectorAll("video").forEach(video => video.pause());
    galleryVideo.current?.select(next === 1);
    setIndex(next);
  };
  useGSAP(() => {
    const images = gsap.utils.toArray<HTMLElement>(".character-slide");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    images.forEach((image, imageIndex) => {
      gsap.to(image, {
        autoAlpha: imageIndex === index ? 1 : 0,
        duration: reduced ? 0 : 0.5,
        ease: "portfolioReveal",
        overwrite: true,
      });
    });
    gsap.fromTo(images[index], { x: reduced ? 0 : direction.current * 18 }, {
      x: 0, duration: reduced ? 0 : 0.6, ease: "portfolioReveal", overwrite: "auto",
    });
  }, { scope: ref, dependencies: [index] });
  return (
    <div ref={ref} className="character-carousel" role="region" aria-roledescription="carousel" aria-label={`${project.title}作品展示`}>
      <div className="character-slides" id={`gallery-${project.slug}`}>
        {project.images.map((src, imageIndex) => (
          <div className="character-slide" key={src} aria-hidden={imageIndex !== index} inert={imageIndex !== index}
            style={{ opacity: imageIndex === 0 ? 1 : 0, visibility: imageIndex === 0 ? "visible" : "hidden" }}>
            {imageIndex === 0 && project.interaction ? <CharacterInteraction config={project.interaction} active={index === 0} name={project.title} /> : imageIndex === 1 ? <GalleryVideo ref={galleryVideo} src={project.galleryVideo.src} poster={project.galleryVideo.poster} active={index === 1} name={project.title} /> : <img className={imageIndex === 1 && project.interaction ? "character-slide-sharp" : undefined} src={src} alt={`${project.title} — 图片 ${imageIndex + 1}`} loading="eager" draggable={false} />}
          </div>
        ))}
      </div>
      <button className="gallery-arrow gallery-arrow-prev" type="button" aria-label="上一项" aria-controls={`gallery-${project.slug}`} onClick={() => change(-1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
      </button>
      <button className="gallery-arrow gallery-arrow-next" type="button" aria-label="下一项" aria-controls={`gallery-${project.slug}`} onClick={() => change(1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">{project.title}，第 {index + 1} 项，共 {project.images.length} 项</span>
    </div>
  );
}

export function ProjectPage({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useIntro();
  useGSAP(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(`character-${project.slug}`);
      if (section) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, { scope: ref, dependencies: [ready, project.slug] });
  useGSAP((_, contextSafe) => {
    const root = ref.current;
    if (!ready || !root || !contextSafe) return;
    const media = gsap.matchMedia();
    media.add("(min-width: 810px) and (prefers-reduced-motion: no-preference)", () => {
      const sections = Array.from(root.querySelectorAll<HTMLElement>(".character-section"));
      let tween: gsap.core.Tween | undefined;
      let moving = false;
      let releaseAt = 0;
      let lastWheelAt = -Infinity;
      let gestureConsumed = false;
      let accumulated = 0;
      let direction = 0;
      const sectionTop = (index: number) => sections[index].getBoundingClientRect().top + window.scrollY;
      const currentIndex = () => sections.reduce((nearest, _section, index) =>
        Math.abs(sectionTop(index) - window.scrollY) < Math.abs(sectionTop(nearest) - window.scrollY) ? index : nearest, 0);
      const navigate = contextSafe((index: number) => {
        if (moving || performance.now() < releaseAt || index < 0 || index >= sections.length) return;
        moving = true;
        tween = gsap.to(window, {
          scrollTo: { y: sectionTop(index), autoKill: false },
          duration: 1.05,
          ease: "power2.inOut",
          onComplete: () => {
            moving = false;
            releaseAt = performance.now() + 320;
          },
          onInterrupt: () => { moving = false; },
        });
      });
      const wheel = (event: WheelEvent) => {
        if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
        const now = performance.now();
        const step = Math.sign(event.deltaY);
        const current = currentIndex();
        // Preserve native access to the footer and the top boundary.
        if (!moving && ((current === 0 && step < 0 && window.scrollY <= 2) ||
          (current === sections.length - 1 && step > 0 && window.scrollY >= sectionTop(current) - 2))) return;
        event.preventDefault();
        if (now - lastWheelAt > 220) {
          gestureConsumed = false;
          accumulated = 0;
          direction = step;
        }
        lastWheelAt = now;
        if (moving || now < releaseAt) {
          gestureConsumed = true;
          return;
        }
        if (gestureConsumed) return;
        if (direction !== step) { accumulated = 0; direction = step; }
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
        accumulated += Math.min(Math.abs(event.deltaY) * unit, 80);
        if (accumulated >= 55) {
          gestureConsumed = true;
          navigate((sectionTop(current) - window.scrollY) * step > 5 ? current : current + step);
        }
      };
      const click = (event: MouseEvent) => {
        const link = (event.target as Element).closest<HTMLAnchorElement>(".character-scroll-next");
        if (!link) return;
        const index = sections.findIndex(section => `#${section.id}` === link.getAttribute("href"));
        if (index < 0) return;
        event.preventDefault();
        navigate(index);
      };
      const keydown = (event: KeyboardEvent) => {
        if (event.target instanceof Element && event.target.closest("button,a,input,textarea,select,[contenteditable=true]")) return;
        const step = ["ArrowDown", "PageDown", " "].includes(event.key) ? (event.shiftKey ? -1 : 1) : ["ArrowUp", "PageUp"].includes(event.key) ? -1 : 0;
        if (!step) return;
        const next = currentIndex() + step;
        if (next < 0 || next >= sections.length) return;
        event.preventDefault();
        navigate(next);
      };
      window.addEventListener("wheel", wheel, { passive: false });
      window.addEventListener("keydown", keydown);
      root.addEventListener("click", click);
      return () => {
        tween?.kill();
        window.removeEventListener("wheel", wheel);
        window.removeEventListener("keydown", keydown);
        root.removeEventListener("click", click);
      };
    });
    return () => media.revert();
  }, { scope: ref, dependencies: [ready, project.slug], revertOnUpdate: true });
  return (
    <div className="character-story" ref={ref}>
      {data.projects.map((character) => (
        <section className="character-section" id={`character-${character.slug}`} key={character.slug} aria-labelledby={`title-${character.slug}`}>
          <aside className="character-info">
            <div className="project-details">
              <div>
                <p className="muted">Character Name</p>
                <h1 className="project-title" id={`title-${character.slug}`}>{character.title}<span className="project-title-chinese">{character.titleChinese}</span></h1>
              </div>
              <dl className="project-facts">
                <dt>Category</dt><dd>{character.category}</dd>
                <dt>Year</dt><dd>{character.year}</dd>
              </dl>
              {character.summary && <p className="project-summary">{character.summary}</p>}
            </div>
            <div className="character-detail-images">
              {character.detailImages.map((src, imageIndex) => <div className={`character-detail-image detail-image-${imageIndex}`} key={imageIndex}>
                {src && <img src={src} alt={`${character.titleChinese} — 细节 ${imageIndex + 1}`} loading="lazy" />}
              </div>)}
            </div>
          </aside>
          <div className="character-gallery-area"><CharacterGallery project={character} /></div>
        </section>
      ))}
      <SiteFooter />
    </div>
  );
}
