# ASSETS — Discovery, Generation & Audit (Section 14)

## Art direction lock (used for every generated asset)
> Vintage engraved illustration, fine cross-hatching, black ink on warm ivory `#F0E8D8`, deep crimson `#8D101D` / blood red `#B51F2B` accent, muted blue `#344A63` shadows, ink black `#090909`. Same hooded traveler, same bottle trio (crimson / obsidian / ivory), same gothic + Art Deco architecture. No text, no watermark.

## A. Searched / licensed sources
- **Fonts:** Google Fonts (OFL) — Cinzel, Cormorant Garamond, Manrope. Loaded via Google Fonts CDN.
- **Libraries:** Three.js, GSAP, Lenis via jsDelivr CDN (MIT/BSD-style licenses). No reference-site code or assets were taken.
- **Stock:** The v1 Unsplash photos were **removed** in the asset pass and replaced by the original generated plates below — the site no longer depends on stock photography.

## B. Generated original illustrations (`web/assets/illustrations/`)
Generated with the project's image-generation tool, then verified visually, resized to ≤1600px and recompressed (JPEG q82, progressive).

| File | Scene | Purpose | Verified |
|---|---|---|---|
| `traveler-awakening.jpg` (536 KB, 1600×1067) | 01 Awakening + og:image + story strip | Main character — hooded traveler at crimson horizon | ✅ viewed, on-palette, traveler matches ruins plate |
| `ruins-journey.jpg` (562 KB, 1200×1600) | 02 Journey | Environmental illustration — gothic ruins, fallen columns, same tiny traveler | ✅ viewed |
| `portal-crimson.jpg` (541 KB, 1200×1600) | 03 Portal + story strip | Portal artwork — gothic arch, swirling crimson liquid, blue reflections | ✅ viewed |
| `sanctuary-bottles.jpg` (546 KB, 1067×1600) | 04 Sanctuary + story strip | Product + architecture — cathedral with the exact 3 bottles on pedestal | ✅ viewed, bottle colours match products |

Generation prompts are the art-direction lock above + a scene sentence each (traveler / ruins / portal / sanctuary). Character, palette, lighting direction and technique are identical across all four.

## C. Procedural assets (code, no files)
- Dust particles (9k desktop / 3.5k coarse) — Three.js `Points` + custom shader
- Ruins columns, sanctuary columns + pedestal — Three.js geometry
- **Portal liquid** — custom GLSL fbm-noise shader with mouse ripple + chromatic fringe (the live portal; the plate is its illustrated counterpart)
- 3 bottles in the Sanctuary — Three.js physical materials (crimson / blue / ivory), matching the plate
- Vortex (14k / 5k points) — spiral BufferGeometry, scroll-driven
- Ambient audio — generated WebAudio drone (55 / 82.4 / 110 Hz), off by default; no audio file needed
- Film grain — inline SVG turbulence; favicon — hand-written SVG

## D. Structure
```
web/
  index.html
  favicon.svg
  assets/css/main.css
  assets/js/engine.js   (procedural 3D)
  assets/js/main.js     (scroll/UI/audio)
  assets/illustrations/ (4 generated plates above)
```

## F. Final audit (2026-11-20)
- Every `src`/`href` in `index.html` resolved against the filesystem — see audit output in the repo PR/commit notes; all local paths exist, CDN paths are the 5 library/font URLs.
- No broken local links, no fake paths, no unused generated files (JSON sidecars from generation were deleted).
- Images are lazy-loaded except the hero plate (`fetchpriority=high`).
