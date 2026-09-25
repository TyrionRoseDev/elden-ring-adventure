# Research: performance budget for the clay look

Resolves GitHub issue #19. Date of research: 2026-09-26.

The baseline is the art-style prototype on `prototype/art-style-death-gag` @ `4c60b44`, variant E, which is the look recorded in [ADR 0004](../adr/0004-clay-look-with-a-fine-ink-line.md). Library facts were checked against the installed packages the prototype pins: `three` 0.186.1, `@react-three/fiber` 9.8.1, `@react-three/drei` 10.7.9, `@react-three/postprocessing` 3.1.2 and `postprocessing` 6.39.5.

Confidence tags:

- **[measured]**: I ran it.
- **[source]**: I read it in the library source.
- **[doc]**: vendor documentation.
- **[extrapolated]**: an estimate, not a measurement.

## Summary: the budget

**Target:** a steady 60 fps (16.7 ms per frame) on a mid-range laptop's integrated GPU (Intel Iris Xe class) at 1920×1080.

**Headroom:** the GPU gets at most 11 ms per frame and the main thread at most 8 ms per frame (JS, animation and render submission together).

**Where the counts come from:** the draw-call, triangle and memory numbers do not depend on the hardware. They were measured in the prototype and derived from it, so treat them as firm.

**Where the milliseconds come from:** they were measured on an Apple M4 and are only an indication for an integrated GPU (see "Iris Xe extrapolation").

### Per character

| Item | Budget | Prototype today |
|---|---|---|
| Triangles (unique, incl. held props) | **≤ 20k** hero/NPC, **≤ 30k** boss | Tarnished 18.4k, Margit 29.7k [measured] |
| glTF primitives (material slots) | **≤ 6** on the skinned body, **≤ 2** per prop | Tarnished 16 (12 body + 4 sword), Margit 21 (9 body + 12 across 5 props) [measured] |
| Draw calls it costs per frame | **3 per primitive** (colour + hull + shadow), so **≤ 18** hero, **≤ 24** boss | Tarnished 47, Margit 62 [derived from primitive counts; the frame total was measured] |
| Bones | **≤ 32** | 15 and 20 [measured] |
| Textures | **none** by default; optional single palette/detail map **≤ 512²** | none [measured] |

### Per Location

| Item | Budget | Prototype arena today |
|---|---|---|
| Unique triangles, incl. instanced sets | **≤ 60k**, of which grass **≤ 10k** | 70.4k; grass and flowers alone are 52.7k [measured] |
| Merged (by-material) static meshes | **≤ 16** | 16 [measured] |
| Instanced sets (grass, flowers, flagstones, rocks, debris) | **≤ 6** `InstancedMesh`es | 0: everything, tufts included, is merged [measured] |
| Draw calls for the set (colour + hull + shadow) | **≤ 50** | ≈ 46 [derived] |
| Shadow casters | Only things that stand up. Ground, flagstones and grass have `castShadow = false` | Everything casts [measured] |

### Per frame

| Item | Budget | Prototype today |
|---|---|---|
| Draw calls, everything (shadow + colour + hulls + post) | **≤ 200** target, **≤ 250** hard cap | 163 = 48 shadow + 98 colour incl. hulls + 17 post [measured] |
| Submitted triangles (incl. hulls and shadow pass) | **≤ 350k** | 340k, of which 112k are in the shadow pass [measured] |
| Render-target memory at 1080p | **≤ 100 MB** on Medium/Low | ≈ 220 MB [extrapolated from formats] |
| Asset texture memory | **≤ 64 MB** | ≈ 0 [measured] |
| Shader programs | **≤ 24**, precompiled with `renderer.compileAsync` when a Location loads | 16 [measured] |
| Shadow map | **2048²** High, **1024²** Medium, **1024² or off** Low | 2048² |
| Composer MSAA | **4×** on High only; SMAA on Medium; no composer on Low | 4× |
| DPR cap | **1.5** High, **1.0** Medium and Low | `[1, 2]` (the R3F default) |
| Default canvas `antialias` | **false** whenever the composer is on | true (the R3F default) |

## Baseline measurements

### Method

**Hardware.** MacBook Air M4 (10-core CPU, 10-core GPU, 24 GB, 120 GB/s unified memory), on AC power, not in Low Power Mode, fanless. **This is not a mid-range integrated GPU.** Apple GPUs are tile-based deferred renderers, and this one has about 1.8× the memory bandwidth of an Iris Xe laptop. Every absolute millisecond below is an M4 number.

**Browsers:**

- **Chrome:** Google Chrome 153, headless, driven by Playwright. Renderer string `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`, WebGL 2, `MAX_SAMPLES` 4.
- **WebKit:** Playwright's WebKit build (UA `Version/26.6 Safari/605.1.15`, renderer `Apple GPU`). This is the engine Safari uses, not Safari itself. **Safari.app was not driven.**
- **Backends:**
  - Safari and Chrome on macOS both run WebGL on ANGLE's Metal backend ([WebKit: Safari 15](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/); [ANGLE README](https://chromium.googlesource.com/angle/angle/+/HEAD/README.md)).
  - Chrome on Windows runs it on ANGLE's D3D11 backend (same README). That is where most Iris Xe laptops live, and it was **not measured**.

**Harness.** Throwaway, not committed; it lived in `/tmp`. It was a production `vite build` of the prototype with URL flags to toggle:

- outlines;
- shadows and shadow map size;
- each post effect;
- composer MSAA and framebuffer type;
- SMAA/FXAA;
- canvas `antialias`;
- DPR;
- grass and motes.

**Probe.** It did four things:

1. **Whole-frame counters:** it set `renderer.info.autoReset = false` and reset `info` once per frame with R3F `addEffect`, so the counts cover every composer pass.
2. **Per-pass split:** it wrapped `renderer.render` and `renderer.shadowMap.render` to split draw calls by pass.
3. **Frame timing:** it ran with `frameloop="never"` and a synchronous bench: `advance()` 40 frames back to back, then a 1-pixel `readPixels` to wait for the GPU. The result is sustained ms per frame, with CPU and GPU pipelined.
4. **Fixed shot:** the Gag was frozen at t = 2.0 s. That is the wide establishing shot, with both characters, the whole courtyard, the grass, the wall and the Erdtree in frame (screenshot checked).

**GPU timer rejected.** `EXT_disjoint_timer_query_webgl2` returned 40–60 ms for frames that ran at over 400 fps on ANGLE/Metal, so I did not use it. WebKit does not expose it at all.

**Noise.** Each suite interleaved its configs over 4–6 rounds (order reversed on alternate rounds) with 3 benches per config per round. The tables report medians. Spread within a session was ±0.3 ms.

**The M4 changed speed between sessions.** The same config ran up to 1.6× apart across sessions (likely GPU clock state; the machine was also in use). Ratios to the baseline stayed stable within a few points across sessions. So **the percentages are the firm result**, and the milliseconds are given as two sessions, A and B.

### GLB contents [measured; a node script over the glTF JSON]

| Asset | Tris | Verts | Primitives | Materials | Textures | Skin |
|---|---|---|---|---|---|---|
| `tarnished_B.glb` | 18,388 | 9,331 | 16 | 12 | 0 | 15 joints, 7 clips |
| `margit_B.glb` | 29,704 | 15,098 | 21 | 15 | 0 | 20 joints, 10 clips |
| `arena.glb` (3.0 MB) | 70,356 | 109,209 | 16 | 16 | 0 | – |
| of which `Set_GrassDark` + `Set_GrassBlade` | 48,200 | 97,530 | 2 | 2 | – | – |
| of which `Set_Flower` | 4,480 | 2,380 | 1 | 1 | – | – |

**The grass is most of the Location:** ≈ 240 tufts × 5 blades × ≈ 40 tris, merged and flat-shaded (2 vertices per triangle). That is 69% of the Location's triangles and ≈ 2.3 MB of the GLB.

**Merging is already done:** `arena.py` merges by material ("one object per material keeps draw calls low").

**Emissive meshes get no hull:** Tarnished's `EyeGlow`, Margit's `OmenEye` and the Erdtree are emissive, so the prototype skips their outline hulls.

### Per-frame counters, variant E, 1920×1080 [measured, `renderer.info`, whole frame]

| Pass | Draw calls | Triangles |
|---|---|---|
| Shadow pass (2048², one directional light) | 48 | 112,204 |
| Colour pass incl. hulls, sky, motes | 98 | 227,752 |
| Post: bloom luminance + 8 down + 7 up mip passes + 1 merged EffectPass | 17 | 17 |
| **Total** | **163** | **339,973** |

**Other counters:** 16 programs, 53 geometries, 42 textures. All 42 are render targets and bloom mips; the assets have no images.

**Outlines:** every visible non-emissive mesh has a hull twin. Together they cost **46 draw calls and 110k triangles**.

**Composer passes:** `@react-three/postprocessing` merged all seven effects into **one** `EffectPass`: Bloom, ToneMapping, HueSaturation, Sepia(0), TiltShift2(0), Vignette and Noise. The `renderer.render` split was 146 draws in the scene render plus 17 single-draw post renders.

**Effect of turning features off:**

| Feature off | Draw calls | Triangles |
|---|---|---|
| Outlines | 117 | 230k |
| Shadows | 115 | 228k |
| Both | 69 | 118k |
| Arena not casting shadows | 149 (shadow pass 34 draws) | 47k in the shadow pass |

### Frame cost by toggle, 1920×1080, DPR 1 [measured]

Chrome ms are the medians of 18 benches (session A) and 12 benches (session B). WebKit ms are the medians of 15 benches.

| Config | Chrome A ms | Chrome B ms | % of baseline (A / B) | WebKit ms (% of baseline) |
|---|---|---|---|---|
| **Baseline E**: composer MSAA 4×, HalfFloat, bloom, 2048² shadow, outlines on everything, canvas AA on | **7.52** | **4.66** | 100 / 100 | **4.67** (100) |
| Post-processing off entirely (canvas AA 4× on, ACES from the renderer) | 2.14 | 1.50 | 28 / 32 | 2.5–6.0, unstable ‡ |
| Composer MSAA 4× → 0 (canvas AA off) | 3.83 | 2.50 | **51 / 54** | 2.50 (54) |
| Composer MSAA 4× → 2× | 5.72 | – | 76 | – |
| Composer HalfFloat → UnsignedByte (MSAA 4× kept) | 4.96 | – | 66 | – |
| MSAA 0 + SMAA | 4.75 | – | 63 | – |
| MSAA 0 + FXAA | 3.74 | – | 50 | – |
| Bloom off | 6.41 | 3.81 | 85 / 82 | 6.05 ‡ |
| Shadows off | 6.28 | 3.77 | 83 / 81 | 4.22 (90) |
| Shadow map 2048² → 1024² | 7.43 | – | 99 (noise) | – |
| Outlines off (−46 draws, −110k tris) | 7.44 | – | 99 (noise) | 4.58 (98) |
| Grass and flowers off (−158k submitted tris) | 7.47 | – | 99 (noise) | – |
| Canvas `antialias` off (composer still on) | 7.37 | – | 98 | 4.42 (95) |
| **Proposed High**: canvas AA off, Sepia and TiltShift2 removed, the rest as E | 6.93 | 4.19 | 92 / 90 | 4.22 (90) |
| **Proposed Medium**: MSAA 0 + SMAA, 1024² shadow, canvas AA off | 4.48 | 2.71 | **60 / 58** | 3.30 (71) |
| **Proposed Low**: no composer, 1024² shadow, outlines on characters only | 1.79 | 1.32 | **24 / 28** | 1.9–4.5, unstable ‡ |

‡ **WebKit anomalies.** In WebKit, the configs with no composer (drawing straight to the multisampled canvas) swung between two speeds from round to round, and "bloom off" came out slower than the baseline. I did not track down why. Treat the WebKit column as a check on direction, not a number to hold.

**First frames.** The first frames after load (program compile) took 130–280 ms in Chrome and 140 ms–1.4 s in WebKit.

### Resolution and DPR [measured]

Chrome, 1440×900 CSS viewport (MacBook-class), ms per frame:

| Config | DPR 1 (1.30 MP) | DPR 1.5 (2.92 MP) | DPR 2 (5.18 MP) |
|---|---|---|---|
| Baseline E | 5.06 | 10.19 | **17.35** |
| High | 4.59 | 9.01 | – |
| Medium | 2.91 | 5.77 | 9.63 |
| Low | 1.62 | – | 2.81 |

**What the DPR runs show:**

- **Composer cost grows with pixel count.** It is roughly linear: about 3.1 ms per megapixel for the baseline and 1.7 ms per megapixel for Medium.
- **Low is nearly flat**, because a canvas with no composer pays for its pixels only once.
- **The full look at DPR 2 misses 60 fps even on an M4** (17.35 ms). An earlier, noisier session measured 36.6 ms at the same size. So R3F's default `dpr={[1, 2]}` has to go.

### Main-thread cost of draw calls [measured]

**Setup.** Chrome with DevTools CPU throttling at 6× (a proxy for a slow laptop CPU). It slows the page's main thread only, not Chrome's GPU process.

**Results.** Time per frame on the main thread (animation, React, three.js submission):

| Draw calls | Main thread per frame |
|---|---|
| 163 | 3.0 ms |
| 117 | 2.3 ms |
| 115 | 2.1 ms |
| 69 | 1.6 ms |

That is **≈ 0.015 ms per draw call at 6× throttle** (≈ 0.003 ms unthrottled).

**What it means for the cap:** 250 draws would cost about 4.3 ms on that slow CPU, which is inside the 8 ms main-thread budget. Draw calls are a secondary constraint for this game; pixels are the first. This agrees with R3F's guidance: "no more than 1000 as the very maximum, and optimally a few hundred or less" ([R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)). The ANGLE/driver cost in Chrome's GPU process is not in this number.

### Extensions [measured]

Chrome 153 and WebKit 26.6 on this Mac both expose:

- `WEBGL_multi_draw` (needed by `BatchedMesh`);
- `KHR_parallel_shader_compile` (used by `compileAsync`);
- `EXT_color_buffer_half_float` (needed for the HalfFloat composer targets);
- ASTC, ETC and S3TC compressed textures.

Both report `MAX_SAMPLES` 4. So a composer `multisampling` of 8 (the `@react-three/postprocessing` default) cannot be honoured on these GPUs.

### Iris Xe extrapolation [extrapolated, low confidence]

**The comparison chip.** An i5-1135G7 has 80 EUs at up to 1.30 GHz with LPDDR4x-4267 ([Intel ARK](https://www.intel.com/content/www/us/en/products/sku/208658/intel-core-i51135g7-processor-8m-cache-up-to-4-20-ghz/specifications.html)). That gives ≈ 68 GB/s on a 128-bit bus, against 120 GB/s for the M4 ([Apple, MacBook Air M4 specs](https://support.apple.com/en-us/122209)).

**Why the costs scale badly.** The Iris Xe has roughly half the compute. It is also an immediate-mode GPU, so the MSAA and full-screen passes that Apple's tile memory absorbs cost it real memory bandwidth.

**The assumption.** Iris Xe takes **2.5–4× the M4's milliseconds** at the same resolution. The table applies that factor to the range of the two Chrome sessions.

| Tier at 1080p, DPR 1 | M4 measured | Iris Xe estimate | Holds 60 fps? |
|---|---|---|---|
| Baseline E | 4.7–7.5 ms | 12–30 ms | **No** |
| High | 4.2–6.9 ms | 10–28 ms | Not reliably. High is for discrete GPUs and Apple Silicon |
| Medium | 2.7–4.5 ms | 7–18 ms | Probably, with `PerformanceMonitor` fallbacks (bloom off, then DPR 0.85) |
| Low | 1.3–1.8 ms | 3–7 ms | Yes |

**Before these become hard targets:** the harness needs a run on a real Iris Xe or Radeon 680M laptop, in Chrome on Windows, and in Safari.app (see Open questions).

## What costs the most

### 1. The composer's 4× MSAA on a HalfFloat target: ≈ 46–49% of the frame

**How much:** turning it off cut the frame to 51–54% in both browsers.

**Why it is so heavy:**

- `EffectComposer` renders the scene into a multisampled `RGBA16F` target with a 4× depth buffer. With the resolve, that is ≈ 56 B/px, or ≈ 116 MB at 1080p.
  - Sources: `postprocessing` `EffectComposer.createBuffer` passes `samples: multisampling` and `type` [source]. `@react-three/postprocessing` defaults to `multisampling = 8` and `frameBufferType = HalfFloatType` [source].
  - The byte sizes are extrapolated; depth is rounded up to 4 B per [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- The composer's `outputBuffer` is `inputBuffer.clone()`, so it inherits the sample count. It probably stays unallocated, because three.js allocates render targets on first bind and this chain never binds it [source, inferred].

**Cheaper alternatives:**

| Alternative | Frame (% of baseline) |
|---|---|
| SMAA | 63% |
| FXAA | 50% |
| 2× MSAA | 76% |
| 8-bit target with 4× MSAA kept | 66% |

### 2. Bloom: ≈ 15–18%

**How it is built:** one luminance pass plus `MipmapBlurPass` at its default 8 levels, which is 8 downsample and 7 upsample draws [source: `BloomEffect` `levels = 8`, `mipmapBlur = true`].

**Why it matters:** on a bandwidth-starved integrated GPU it is the next thing to cut.

### 3. The shadow pass: ≈ 17–19% in Chrome, 10% in WebKit

**Why it is expensive:** it has 48 draws and 112k triangles, a third of all submitted triangles, because every mesh casts. That includes the flat flagstones and all 48k grass triangles. Stopping the arena from casting removed 65k shadow triangles and 14 draws [measured].

**Map size:** going from 2048² to 1024² barely changed the M4's time. It does save 12 MB of 32-bit `DepthTexture` [source: `WebGLShadowMap` allocates `DepthTexture(..., UnsignedIntType)`].

**`PCFSoftShadowMap` is gone:**

- r186 **removed `PCFSoftShadowMap`**. R3F's `shadows={true}` still asks for it [source: R3F 9.8.1].
- three warns and falls back to `PCFShadowMap`. That filter is 5 hardware-PCF taps on a Vogel disk per shaded pixel [source: `WebGLShadowMap.js`, `shadowmap_pars_fragment`].

### 4. The default canvas framebuffer

**The waste:** R3F creates the context with `antialias: true` [source: R3F 9.8.1 default GL props]. Behind a composer, that multisampled default framebuffer only ever receives one full-screen quad.

**Cost:** ≈ 66 MB of memory at 1080p [extrapolated] and 2–5% of the frame [measured]. Turn it off whenever the composer is on.

### 5. Outlines: cheap in milliseconds, expensive in counts

**Counts:** the inverted hulls add 46 draw calls to the colour pass (doubling its mesh draws) and 110k triangles. They cost no measurable time on the M4 in Chrome and 2% in WebKit.

**Skinning cost:** each skinned hull is a second `SkinnedMesh` bound to the same skeleton, so every vertex is skinned again. The prototype also sets `frustumCulled = false` on those hulls.

**drei `<Outlines>` has the same shape:**

- It builds one hull child per mesh: a `SkinnedMesh`, `InstancedMesh` or `Mesh` sharing the parent's skeleton or `instanceMatrix`.
- Its default `angle = Math.PI` also runs `toCreasedNormals`, which calls `toNonIndexed()`, so each hull gets its own de-indexed copy of the vertices.
- The prototype's hand-rolled hull shares the parent's geometry instead.
- Sources: drei 10.7.9 `core/Outlines.js`; three-stdlib `toCreasedNormals` [source].

**When outlines start to matter:** they only become a real cost once the draw count grows with more characters, which is why they sit inside the draw-call budget rather than the millisecond budget.

### 6. Grass as merged geometry

**Time:** no measurable cost at this density.

**Everything else:** it is 69% of the Location's triangles and 2.3 MB of download. Once the hull and shadow copies are counted, it submits 3× its own triangles. And as one merged mesh it cannot be culled, thinned for Low, or made into a level of detail per tuft.

### 7. Leftover no-op effects

**What is left in the pass:** `Sepia` at intensity 0 and `TiltShift2` at blur 0 are still compiled into the merged pass.

**Why TiltShift2 matters anyway:**

- It still takes 10 texture samples per pixel at radius 0 [source: `TiltShift2` shader, `samples = 10`].
- It carries the `CONVOLUTION` attribute, so any future convolution effect (SMAA, depth of field) is forced into a separate pass [source: `buildPasses` merge rules].

**Recommendation:** no measurable time now, but remove both.

## Quality tiers

**Choosing a tier:** at startup, from `WEBGL_debug_renderer_info` plus a short warm-up.

**Stepping down within a tier:** drei `<PerformanceMonitor>` [source: drei `core/PerformanceMonitor.js`]. Its defaults:

- 250 ms samples over 10 iterations;
- bounds of `[40, 60]` fps at 60 Hz and `[60, 100]` above 100 Hz;
- `factor` stepping in increments of 0.1.

**Don't use drei `<AdaptiveDpr>` for this.** It only follows `performance.current`, which changes when something calls `regress()`, not when fps drops [source: drei `core/AdaptiveDpr.js`; [R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)]. Drive the DPR from `PerformanceMonitor` instead.

Savings in the last column are Chrome session A, 1080p, unless stated.

| Toggle | High | Medium (default on integrated GPUs) | Low | Measured saving |
|---|---|---|---|---|
| DPR cap | 1.5 | 1.0 (0.85 on decline) | 1.0 (0.75 on decline) | Baseline: DPR 2 → 1.5 −41%, 1.5 → 1 −50% |
| Canvas `antialias` | off (composer on) | off | **on** (no composer, so hardware MSAA is the AA) | 2–5%, ≈ 66 MB |
| Composer | on, HalfFloat | on, HalfFloat | **off**; ACES comes from the renderer's `toneMapping` | −72% for the whole chain |
| Composer AA | MSAA 4× | MSAA 0 + SMAA (FXAA on decline) | – | −37% (SMAA), −50% (FXAA) |
| Bloom | on | on (off on decline) | off | −15 to −18% |
| Tone map, saturation, vignette, grain | on | on | ACES only | These all share the one merged pass; no separate cost |
| Shadow map | 2048², PCF | 1024², PCF | 1024², characters only, or off | −17 to −19% off; −12 MB for 1024² |
| Shadow casters | characters + standing props | same | characters only | −65k shadow tris, −14 draws |
| Outlines | everything | everything | characters only | −14 draws, −65k tris |
| Grass density | 100% | 100% | 50% (instance `count`) | – |
| **Whole tier vs baseline E** | 90–92% | 58–60% | 24–28% | [measured] |

**The trade the user must sign off on.** Low keeps ACES, the clay materials, the ink line on characters and a key-light shadow. It loses the bloom glow, the vignette and the grain (see Open questions).

## Rules for the Blender scripts

1. **Merge by material, per object.**
   - Each character exports one skinned mesh with **≤ 6 material slots**; each prop **≤ 2**.
   - Every slot is a glTF primitive, and every primitive costs 3 draws (colour, hull, shadow).
   - Collapse same-look materials into one slot and tint them with vertex colours if needed. Examples: Tarnished's `Steel`/`DarkSteel`/`Visor`; Margit's `Socket`/`Horn`.

2. **Keep emissive parts in their own slot.** Glowing slots get no hull (the prototype already skips them), and they should not cast shadows.

3. **Merge static set dressing by material into ≤ 16 meshes per Location.** This is the `arena.py` pattern. Split by region only where culling needs it.

4. **Instance repeated things; don't merge them.**
   - **What counts as repeated:** grass tufts, flowers, flagstones, rocks and debris.
   - **Export format:** one small mesh plus a transform list, either as glTF `EXT_mesh_gpu_instancing` or as a JSON sidecar. The Engine builds an `InstancedMesh` from it. [`InstancedMesh`](https://github.com/mrdoob/three.js/blob/r186/src/objects/InstancedMesh.js) is for "the same geometry and material(s) but with different world transformations" [source].
   - **Colour variation:** per-instance colour (`instanceColor`) replaces the four `Stone*` materials.
   - **Hulls:** each instanced set's hull must itself be an `InstancedMesh` sharing the `instanceMatrix`, as drei `<Outlines>` does.
   - **Mixed debris:** use `BatchedMesh` for different geometries that share one material. It multi-draws with per-object culling, and falls back to one draw per object when `WEBGL_multi_draw` is missing [source: `BatchedMesh.js`, `WebGLRenderer.js`]. Both test browsers have that extension.

5. **Vertex counts.**
   - Hero/NPC ≤ 20k tris; boss ≤ 30k including props; Location ≤ 60k unique tris.
   - A grass tuft is ≤ 40 tris (5 blades × 2–4 segments × 2), not ≈ 200.
   - Smooth-shade wherever the look allows. Flat shading doubles the vertex count; the grass is at 2 vertices per triangle.

6. **Make normals smooth and outward-facing.**
   - The hull is the mesh pushed 0.005 units along its normals, so split normals crack the ink line at hard edges.
   - Bevel instead of splitting (`rbox` in the arena script already does).
   - Weld duplicate vertices before export.

7. **Mark shadow casters.** A custom property such as `cast_shadow = false` on ground, flagstones and grass lets the Engine skip them in the shadow pass.

8. **No image textures by default.** The look is material colour plus light. If a texture is ever needed:
   - at most 512² per character and 1024² per Location;
   - power-of-two sizes;
   - KTX2 (both browsers expose ASTC/ETC/S3TC).

9. **≤ 32 bones per character.** The shadow pass and every hull re-skin the mesh, so each vertex is skinned 3 times per frame.

10. **Report the counts.** `build.sh` should print tris, primitives and materials per GLB, and fail when an asset is over budget. The node script used here is about 25 lines that walk the glTF JSON.

## Engine rules that follow

- **`Canvas` props:**
  - `dpr={[1, 1.5]}` on High and `1` on Medium/Low;
  - `gl={{ antialias: !composerOn }}`;
  - `shadows="percentage"` rather than `true`, which asks for the removed `PCFSoftShadowMap`.
- **`EffectComposer`:** set `multisampling` explicitly for each tier. The `@react-three/postprocessing` default is **8**, which these GPUs clamp to 4 [source; measured `MAX_SAMPLES`]. Delete `Sepia` and `TiltShift2` from the stack.
- **Skinned hulls:** leave `frustumCulled` on and compute a bounding sphere, so the hulls of off-screen actors are culled.
- **Shader compile:** precompile each Location's programs during the transition with `renderer.compileAsync(scene, camera)`. It uses `KHR_parallel_shader_compile` when available [source: `WebGLRenderer.js`]. This keeps the 130 ms–1.4 s first-frame compile out of the middle of a Gag.
- **Dev overlay:**
  - Keep the probe as a dev-only overlay of whole-frame `renderer.info` totals (`autoReset = false`, reset in `addEffect`).
  - Without it, `info` shows only the composer's last full-screen pass, because it auto-resets on every `render()` call.
  - Sources: `WebGLInfo.js`; `postprocessing` never touches `info.autoReset` [source].
- **Frame loop:**
  - A static Vignette can run `frameloop="demand"` between Gags ([R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)).
  - The motes and idle clips then need `invalidate()` or a low-rate loop.

## Sources

**Library source, read in the installed packages:**

- **three.js r186** (installed 0.186.1), under `src/`:
  - `renderers/webgl/WebGLInfo.js`: per-draw `calls`/`triangles` counting and `autoReset`.
  - `renderers/webgl/WebGLShadowMap.js`: `PCFSoftShadowMap` removed; 32-bit depth texture; casters culled against the shadow frustum.
  - `renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl.js`: 5-tap PCF.
  - `objects/InstancedMesh.js` and `objects/BatchedMesh.js`.
  - `renderers/WebGLRenderer.js`: the multi-draw fallback and `compileAsync`.
  - Repo: <https://github.com/mrdoob/three.js/tree/r186/src>.
- **`postprocessing` 6.39.5:** `EffectComposer` (`createBuffer`; `outputBuffer = inputBuffer.clone()`), `BloomEffect`, and `MipmapBlurPass` (8 levels). Repo: <https://github.com/pmndrs/postprocessing/tree/v6.39.5/src>.
- **`@react-three/postprocessing` 3.1.2** (`dist/index.js`):
  - `EffectComposer` defaults: `multisampling = 8`, `HalfFloatType`, and the renderer's `toneMapping` forced to `NoToneMapping`.
  - The `buildPasses` merge rules (`CONVOLUTION` / `mainUv`).
  - The `TiltShift2` shader.
  - Repo: <https://github.com/pmndrs/react-postprocessing/tree/v3.1.2/src>.
- **`@react-three/drei` 10.7.9:** `core/Outlines.js`, `core/PerformanceMonitor.js`, `core/AdaptiveDpr.js`. Repo: <https://github.com/pmndrs/drei/tree/v10.7.9/src/core>.
- **`@react-three/fiber` 9.8.1:** default `dpr [1, 2]`, `antialias: true`, `powerPreference: 'high-performance'`, `shadows` → `PCFSoftShadowMap`, and ACES tone mapping by default.

**Documentation:**

- [R3F: Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).
- [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): batching draw calls, per-pixel VRAM budgeting, depth/stencil rounded to 4 bytes, rendering into a smaller back buffer.
- [ANGLE README](https://chromium.googlesource.com/angle/angle/+/HEAD/README.md): D3D11 on Windows, Metal on macOS.
- [WebKit: Safari 15](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/): WebGL on Metal via ANGLE.

**Hardware specs:**

- [Intel ARK: Core i5-1135G7](https://www.intel.com/content/www/us/en/products/sku/208658/intel-core-i51135g7-processor-8m-cache-up-to-4-20-ghz/specifications.html).
- [Apple: MacBook Air M4 tech specs](https://support.apple.com/en-us/122209).

**Measurements:** the throwaway harness described under Method, run on 2026-09-25/26 against `prototype/art-style-death-gag` @ `4c60b44`. Nothing from it is committed.

## Open questions

1. **Real integrated-GPU numbers.** The Iris Xe column is extrapolated. The same harness should run on a Windows laptop with an Iris Xe or Radeon 680M in Chrome (ANGLE D3D11), and in Safari.app on macOS. Until then the millisecond targets are a plan, not a budget. The counts (draws, tris, memory) are firm.
2. **Is SMAA good enough on a 0.005-unit ink line?** At 1080p and DPR 1 the line is often under a pixel wide, and without MSAA it may shimmer. The user needs to compare High and Medium side by side, in motion, before Medium becomes the default.
3. **Does Low keep enough of the look?** Losing bloom takes the glow off the eyes and the Erdtree. A cheap alternative would give Low its glow without a composer: emissive sprites or a halo mesh on the glowing parts.
4. **HalfFloat or 8-bit?** An 8-bit composer target saved 34% with MSAA on. Nobody has checked visually whether the bloom threshold (0.85) still picks out the glows without HDR headroom.
5. **The WebKit anomalies.** With no composer, the frame time was bimodal, and bloom-off came out slower than bloom-on. Re-check both in Safari.app.
6. **Characters per Gag.** The budget assumes 2–4 characters on screen. A crowd Gag needs its own ticket, e.g. instanced low-poly extras with no hulls.
