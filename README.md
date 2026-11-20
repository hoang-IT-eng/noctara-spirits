# NOCTARA — Immersive Spirits

A cinematic, scroll-driven web experience for a premium spirits brand, built as an original illustrated universe — **not** a copy of any reference site's code or assets.

**Brand invented for this project:** NOCTARA Spirits
**Art direction:** *Engraved Nocturne* — Ink Black `#090909`, Deep Crimson `#8D101D`, Blood Red `#B51F2B`, Warm Ivory `#F0E8D8`, Muted Blue `#344A63`. One motif everywhere: the crimson portal (liquid shader disc + ring) — it is the loader mark, the Chapter III centrepiece, the light source, and the vortex heart.

## The six chapters

1. **The Awakening** — darkness, dust particles, crimson horizon, masked title `ENTER THE UNKNOWN`
2. **The Journey** — camera follows the traveler through ruins; comic caption integrated into the scene; scroll = forward movement, cursor steers, velocity skews type
3. **The Portal** — real-time liquid shader (fbm noise + mouse ripple + chromatic fringe); click / move to ripple; scroll passes through
4. **The Sanctuary** — cathedral space with 3 collectible bottles in Three.js + DOM detail panel. Selecting a bottle moves light, scales the artifact, and swaps tasting notes
5. **The Transformation** — bottle rises, GPU vortex of crimson particles follows scroll progress or the Trigger button
6. **The Brand Reveal** — `CHILL YOUR SPIRIT. SHAKE YOUR SPIRIT. POUR YOUR SPIRIT.` + editorial story, collection strip, and working allocation form (front-end)

## Tech

- Vanilla HTML/CSS/JS in `web/` — no build step, deploys as static
- Three.js (one WebGL context, one canvas re-parented as fixed world) — dust points, ruins, portal liquid `ShaderMaterial`, sanctuary bottles, vortex points. No per-frame CPU particle loops; DPR capped 1.5 / 1.25 coarse
- GSAP + ScrollTrigger (reveals, masked titles, velocity skew) on Lenis smooth scroll (Lenis runs on requestAnimationFrame, ScrollTrigger synced)
- Sound: generated WebAudio drone, **off by default**, toggle fades in — never autoplays
- Fallbacks: `prefers-reduced-motion`, no-WebGL, and coarse pointers all get a complete, readable static page; all product/brand info lives in the DOM for screen readers

## Products (original)

| Spirit | Style | Notes |
|---|---|---|
| Crimson Origin — $189 | Single Cask Red Aperitif, 46% | bitter cherry, smoked plum, black pepper |
| Obsidian Veil — $165 | Midnight Botanical Dark Gin, 44% | juniper, black cardamom, sea salt |
| Ivory Eclipse — $210 | Ivory Liqueur, 38% | white tea, pear, vanilla ash |

## Run locally

```bash
cd web && python3 -m http.server 8000
# http://localhost:8000  — QA flags: add ?reduced to test, resize for mobile composition
```

## Deploy

Cloudflare Pages, production branch `main`, output directory `web` (see `wrangler.toml`). Push to `main` auto-deploys.

## Legal note

Inspired by the *techniques* of cinematic spirits sites (scroll-driven camera, portal, chaptered storytelling). All code, shaders, copy, brand, and product names are original to this repo. Images are Unsplash (freely licensed) with heavy grading; no assets were extracted from any reference website.
