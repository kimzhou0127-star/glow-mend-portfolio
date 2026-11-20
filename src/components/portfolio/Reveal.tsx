"use client";
import { useRef, type ReactNode, type ElementType } from "react";
import { gsap, useGSAP, SplitText } from "./motion";
import { useIntro } from "./SiteShell";

export function Reveal({
  children,
  className = "",
  as: Tag = "p",
  mode = "chars",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  mode?: "chars" | "lines" | "scramble";
}) {
  const ref = useRef<HTMLElement>(null);
  const ready = useIntro();
  useGSAP(
    () => {
      if (
        !ready ||
        !ref.current ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const split = SplitText.create(ref.current, {
        type: "lines,words,chars",
        autoSplit: true,
        aria: "auto",
        onSplit(self) {
          if (mode === "scramble") {
            const chars = self.chars as HTMLElement[];
            const originals = chars.map((char) => char.textContent || "");
            const state = { progress: 0 };
            const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_";
            let lastFrame = -1;
            return gsap.to(state, {
              progress: 1,
              duration: 2,
              delay: 0.1,
              ease: "none",
              onUpdate() {
                const frame = Math.floor(state.progress * 40);
                if (frame === lastFrame && state.progress !== 1) return;
                lastFrame = frame;
                const band = Math.max(1, Math.round(chars.length * 0.25));
                const front = state.progress * (chars.length + band * 2) - band;
                chars.forEach((char, index) => {
                  const settled = index <= front - band || state.progress === 1;
                  char.textContent = settled
                    ? originals[index]
                    : symbols[Math.floor(Math.random() * symbols.length)];
                  char.style.opacity = index <= front || settled ? "1" : "0";
                  char.style.color = settled ? "" : "#6f6f6f";
                });
              },
              onComplete() {
                chars.forEach((char, i) => {
                  char.textContent = originals[i];
                  char.style.opacity = "1";
                  char.style.color = "";
                });
              },
            });
          }
          return gsap.from(mode === "lines" ? self.lines : self.chars, {
            y: mode === "lines" ? 28 : 12,
            opacity: 0,
            duration: 0.9,
            stagger: mode === "lines" ? 0.08 : 0.008,
            ease: "portfolioReveal",
            delay: 0.2,
            scrollTrigger: {
              trigger: ref.current,
              start: "top 95%",
              once: true,
            },
          });
        },
      });
      return () => split.revert();
    },
    { scope: ref, dependencies: [ready, mode], revertOnUpdate: true },
  );
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
