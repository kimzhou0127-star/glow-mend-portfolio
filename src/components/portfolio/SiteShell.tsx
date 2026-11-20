"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { IntroLoader } from "./IntroLoader";
import data from "@/data/portfolio.json";
import { gsap, useGSAP, ScrollTrigger } from "./motion";

const IntroContext = createContext(false);
export const useIntro = () => useContext(IntroContext);
const navigation = ["Work"];

function Navigation() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, []);
  useGSAP(
    () => {
      gsap.to(menu.current, {
        autoAlpha: open ? 1 : 0,
        duration: 0.25,
        ease: "power2.out",
      });
      if (open)
        gsap.fromTo(
          ".mobile-links a",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.05, duration: 0.4 },
        );
    },
    { scope: menu, dependencies: [open] },
  );
  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
      if (event.key === "Tab") {
        const links = menu.current?.querySelectorAll<HTMLAnchorElement>("a");
        if (!links?.length) return;
        if (
          !event.shiftKey &&
          document.activeElement === links[links.length - 1]
        ) {
          event.preventDefault();
          button.current?.focus();
        }
        if (event.shiftKey && document.activeElement === button.current) {
          event.preventDefault();
          links[links.length - 1].focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <>
      <header className={`site-nav ${open ? "menu-is-open" : ""}`}>
        <Link className="identity" href="/" onClick={() => setOpen(false)}>
          <span>{data.profile.name}</span>
          <span className="muted">{data.profile.role}</span>
        </Link>
        <div className="location">
          <span>{data.profile.city}</span>
          <span>
            <span className="muted">Your time&nbsp; </span>
            {time}
          </span>
        </div>
        <nav className="desktop-links" aria-label="Main navigation">
          {navigation.map((label) => (
            <Link
              key={label}
              href={`/${label.toLowerCase()}/`}
              aria-current={
                path.startsWith(`/${label.toLowerCase()}`) ? "page" : undefined
              }
            >
              {label.toUpperCase()}
            </Link>
          ))}
        </nav>
        <div className="nav-social">
          <span>{data.profile.navSignature}</span>
        </div>
        <button
          className="menu-button"
          ref={button}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      <div
        className="mobile-menu"
        ref={menu}
        id="mobile-menu"
        aria-hidden={!open}
        inert={!open}
      >
        <nav className="mobile-links" aria-label="Mobile navigation">
          {navigation.map((label) => (
            <Link
              href={`/${label.toLowerCase()}/`}
              key={label}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mobile-social">
          <span>{data.profile.navSignature}</span>
        </div>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <span className="desktop-copyright">
          {data.copy.footerCopyright}
        </span>
        <span className="mobile-copyright">
          © 2026 {data.profile.name}.&nbsp;{" "}
        </span>
      </div>
      <span className="footer-note">{data.copy.footerNote}</span>
      <span className="footer-credit">{data.copy.footerCredit}</span>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const path = usePathname();
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready || path.startsWith("/work/") || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
      anchors: true,
      allowNestedScroll: true,
    });
    const update = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, [ready, path]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [path]);
  return (
    <IntroContext.Provider value={ready}>
      <div ref={shell}>
        <Navigation />
        <main key={path}>{children}</main>
        <IntroLoader onReady={() => setReady(true)} />
      </div>
    </IntroContext.Provider>
  );
}
