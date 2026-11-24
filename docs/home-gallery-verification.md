# Homepage sphere gallery — release verification

## Change

Replaces only the homepage ring with 12 original-ratio images. Source reference: https://adamjakubowski.pl/ (public sphere component inspected 2026-11-23). Implemented independently with GSAP and DOM image links. The reference's public code uses sphere distribution, billboards, dragging, inertia and modifier-wheel zoom; the approved version uses a white background, no central copy or drag hint, and locally white header/footer glyphs where images pass behind them.

User upload order maps 1–4 to Shield Soother, 5–8 to Mind Trimmer, 9–12 to Gloom Blaster. `src/data/home-gallery.json` preserves original dimensions, filenames and role destinations. Images are interleaved spatially. Generated assets total approximately 1.4 MiB. Image size is 4/3 of the initial sphere preview. The compact orbit is expanded by 8% with small deterministic offsets; the stage retains full-screen boundaries. Character media, loader logic, navigation destinations, and existing project data are unchanged. Navigation text has contrast hooks that are active only on the homepage and cleaned up when leaving.

## Automated verification

- `node scripts/test-home-sphere.mjs`: role links, all original proportions, reachable image bounds over full rotations at 1440/1280/1920/2560 desktop widths and a narrow fallback, damping independence, image decode reveal, automatic rotation, drag suppression, ordinary click, keyboard focus/navigation, pointer cancellation, zoom modifiers, reduced motion, tab visibility, text overlap whitening/recovery and event/ticker cleanup.
- Existing gallery playback and all three character interaction tests pass.
- Production build and TypeScript check pass. ESLint has only the six existing image-element performance warnings.
- User approved the compact-v5 local preview for publication on 2026-11-25. Release goes through the existing repository and Netlify production build.

## Browser verification limitations

The browser controller timed out. Chrome and bundled headless Chromium both could not start in this environment (OS process permission failure). No real-browser screenshot or input performance measurement is claimed. The geometry and lifecycle tests use DOM fixtures; they do not replace visual acceptance.

Preview checks still needed: 1440×900 primary comparison, 1280×800/1920×1080/ultrawide appearance, legibility during multiple overlaps, perceived inertia/hover response, actual click-through, loader transition and native sound playback. A production-style local static server is used because the development watcher exceeded the machine's open-file limit.
