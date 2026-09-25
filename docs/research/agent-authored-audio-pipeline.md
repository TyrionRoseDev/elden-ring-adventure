# Research: agent-authored adaptive music and SFX pipeline

Resolves GitHub issue #15. Date of research: 2026-09-25. Feeds prototype #16 (one adaptive cue plus an SFX set).

Every claim cites the primary source it was checked against: official docs, licence texts, source repos, and the npm, PyPI and Homebrew registries queried directly on 2026-09-25. Confidence tags: **[H]** checked against the primary source; **[M]** primary source was partial or the claim is an inference from it; **[L]** unverified or judgement.

Machine this targets: macOS 26.6.2, arm64, Homebrew, Node 24.14.0, Python 3.14.0. At the time of writing, none of fluidsynth, sox or ffmpeg is installed.

---

## 0. Recommendation in one screen

1. **Scores are TypeScript** in the repo, like the `bpy` scripts are for art. Each cue is a module that exports parts (notes, tempo, bars, stems). `@tonejs/midi` writes one Standard MIDI File per stem. Scripts are the source of truth; WAV and Opus files are build artefacts, as in ADR 0002. [M]
2. **Sampled instruments are the backbone, not chiptune.**
   - **FluidSynth 2.6.1** renders through **GeneralUser GS 2.0.3** (SF2) for broad GM coverage.
   - **sfizz_render 1.2.3** renders featured instruments from **CC0 SFZ libraries**: VSCO 2 CE (orchestra), VCSL (the comedy percussion: slapstick, flexatone, vibraslap, ratchet, anvil, whistles), Karoryfer (War Tuba, pizzicato bass) and FreePats (accordion).
   - Synth colour and the Grace chime are rendered offline with **Tone.js in Node** via `node-web-audio-api`. [H for the tools, M for the quality verdict]
3. **Mixing and mastering are CLI steps.**
   - **sox_ng 14.8.1** handles effects: bend (slide whistle and yelps), pitch, reverb, overdrive, echo, spectrograms.
   - **ffmpeg 9.0.2** handles the rest: `afir` convolution reverb, `amix`, two-pass `loudnorm`, and encoding to **Ogg Opus**.
   - Loops are rendered with their reverb tail folded back onto the start, then trimmed to an exact frame count. [H for the tools, M for the technique]
4. **The runtime is raw Web Audio in the Engine**: a small `MusicDirector` with no runtime audio library.
   - Stems of a cue start at one `when`, so they stay sample-locked. Intensity layers (explore, danger, Combat) are gain ramps.
   - Day and Night switch at the next bar, carrying over the same offset.
   - Gag stingers cut in on the next beat, and the Aftermath cue is scheduled to start sample-exactly when the stinger ends.
   - Howler is not used: it can't schedule. Tone.js stays a build-time dependency only. [H for the APIs, M for the design]
5. **Shipped format:**
   - Ogg Opus at 48 kHz: 96–128 kbps stereo for music stems, 48–64 kbps mono for positional SFX.
   - A `manifest.json` carries BPM, meter, loop frames and stems.
   - Safari 18.4+ supports Ogg Opus. Whether `decodeAudioData` accepts it there is unverified, so #16 must test it, with an AAC `.m4a` fallback ready. [H/M]
6. **SFX** come from three sources:
   - Procedural generators: **jsfxr** (Unlicense) and **ZzFX** (MIT), both rendering headless in Node.
   - Tone.js offline synthesis.
   - **Pink Trombone** (MIT) or **Kokoro-82M** (Apache-2.0) for yelps and gibberish.
   - All of it layered in sox and ffmpeg, with **Kenney CC0** audio as the only raw-sample source that is safe to commit. [H/M]
7. **Licence posture:**
   - Use CC0, MIT, BSD, Unlicense or explicitly unrestricted libraries. Fetch them with a pinned script (URL + SHA-256), don't commit them, and credit them all.
   - Avoid Arachno, Timbres of Heaven, SGM, raw Sonniss/Pixabay/BBC files, macOS `say` voices, MusicGen weights, and the Strudel runtime (AGPL). Details in section 6. [H]
8. **Installs:**
   - `brew install fluid-synth sox_ng ffmpeg cmake`, then build `sfizz_render` from source.
   - `pnpm add -D @tonejs/midi@2.0.28 tone@15.1.22 node-web-audio-api@2.2.0 jsfxr@1.4.1 zzfx@1.3.2`.
   - No accounts needed. Section 8 has details.

---

## 1. Composition routes compared

The deciding constraints: the agent can't listen, so the route has to give good results from symbolic intent (notes, articulations, instrument choice). It also has to render headless and deterministically on arm64, and the look-equivalent quality bar is "genuinely good, and funny".

| Route | Headless on arm64 | Licence effect on output | Quality ceiling for orchestral/folk parody | Verdict |
|---|---|---|---|---|
| MIDI → **FluidSynth** + SF2 | Yes, `brew install fluid-synth` (2.6.1, arm64 bottle) [H] | LGPL tool, output unrestricted; the SoundFont licence governs [H] | Good GM-level; GeneralUser GS is one of the best free GM banks. Flatter articulation than SFZ [M] | **Backbone** |
| MIDI → **sfizz_render** + SFZ | Builds from source; release binary is x86_64 only [H/M] | BSD-2 tool; library licence governs [H] | Highest free ceiling: VSCO 2 CE and SSO have multi-velocity, round-robin orchestral samples [M] | **Featured instruments** |
| **Tone.js offline in Node** (`node-web-audio-api` 2.2.0) | Yes. Verified by the helper: `Tone.Offline` rendered 4 s of PolySynth(FMSynth) + Reverb in 195 ms [H] | MIT / BSD-3, unrestricted [H] | Excellent for synths, bells, chimes, risers, cartoon FX. Poor for acoustic realism [M] | **Synth colour, Grace chime, SFX** |
| Tone.js / Web Audio synthesis **at runtime** | n/a | – | Same as above but costs CPU every frame and varies by device; no benefit when cues are fixed [M] | Reject for music |
| **pedalboard** 0.9.25 (Python, GPL-3.0) | Yes, arm64 wheels [H] | GPL covers the tool, not the output ([GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html#GPLOutput)) [H] | Hosts VST3/AU instruments and effects. Instruments can't sit inside a `Pedalboard` chain; render first, then process [H] | Optional mastering upgrade |
| **DawDreamer** 0.9.0 (Python, GPL-3.0) | Yes, arm64 wheels, py 3.11+ [H] | As above [H] | Multitrack graphs, VST hosting, Faust instruments written as code, PPQN MIDI [H] | Hold in reserve |
| **Surge XT** 1.3.4 (GPL) | CLI is realtime only; offline needs `surgepy` built with cmake [H/M] | Output unrestricted [M] | Strong synth, but not a route to orchestra [M] | Skip for now |
| **SuperCollider** 3.14.1 NRT (`Score.recordNRT`, `scsynth -N`) | Yes, cask [H] | GPL tool [H] | Deterministic and great for synthesis/SFX; poor for realistic orchestra [H] | Skip (Tone covers synthesis in TS) |
| **Csound** 6.18.1 | Yes, brew [H] | LGPL [H] | `sfplay` ignores SF2 modulators, so it sounds flatter than FluidSynth [H] | Skip |
| **Strudel** | No headless export (Playwright only) [H] | Runtime is **AGPL-3.0-or-later** (npm): bundling it makes the game AGPL [H] | Great for live loops, wrong shape for authored cues [M] | **Reject** |
| **Tracker modules** (.it/.xm) via libopenmpt 0.8.9 | `openmpt123` renders to PCM; nothing writes modules, so we'd need our own writer [H/M] | BSD-3 [H] | Compact, with pattern jumps, but only as good as the embedded samples [M] | Reject; the pre-rendered-stem route is simpler |
| **AI generation**: ACE-Step 1.5 | MLX on Apple Silicon [H] | MIT code and weights; model card permits commercial use [H] | Whole songs, 10 s–10 min, repaint/edit. But loopable, beat-locked, key-matched stems are hard to control, and output is only seed-reproducible on the same machine [L] | Not the backbone; possible sketch tool |
| AI: Stable Audio Open 1.0 / Small | MPS unverified [L] | Stability Community Licence (free under $1M revenue, you own outputs); HF login plus licence click-through [H] | Better for SFX textures than music [M] | Optional, needs account |
| AI: MusicGen | MPS shaky [M] | Weights **CC-BY-NC 4.0** [H] | – | Reject (NC weights) |
| AI: YuE | Needs an NVIDIA GPU [H] | – | – | Reject |

**What's good enough for a portfolio piece [M]:** sampled acoustic instruments, well voiced and mixed with a convolution reverb, clear the bar that chiptune or raw oscillator music doesn't. Carbot-style comedy is also mostly orchestral and cartoon: pizzicato and bassoon sneaking, a tuba oom-pah, a timpani roll, a choir that gets undercut. The real risk is not the renderer. It's that the agent can't hear its output, so the pipeline must include objective checks (section 5.5), and #16 exists so the user can judge by ear.

**Music copyright note [M]:** parody the *style* of the Elden Ring score (solemn choir, strings, harp), but never quote its melodies or chord-progression hooks. Carbot's own practice of licensed OST is not ours; the #5 research already says original or CC music only.

---

## 2. Rendering details

### 2.1 FluidSynth 2.6.1

Sources: [FluidSynth repo](https://github.com/FluidSynth/fluidsynth), [settings reference](https://www.fluidsynth.org/api/fluidsettings.xml), issues linked inline.

- Offline render: `fluidsynth -ni -q -F out.wav -r 48000 -g 0.5 -R 1 -C 0 -O float -T wav GeneralUser-GS.sf2 stem.mid`. `-T` accepts wav, flac and oga. [H]
- 2.6 adds `synth.reverb.engine` (fdn, free, lex, dat, smith). We recommend turning built-in reverb **off** (`-R 0`) for stems and applying one shared convolution reverb in the mix, so stems sit in the same room. [H for the flag, M for the advice]
- Gain: `synth.gain` defaults to 0.2, and dense GeneralUser material clips above roughly 0.4 ([#1405](https://github.com/FluidSynth/fluidsynth/issues/1405)). Render to float and normalise afterwards. [H]
- There's about 2–3 s of silence or reverb tail after the last event ([#1433](https://github.com/FluidSynth/fluidsynth/issues/1433)), and no built-in normalise or stop-at-end-of-track ([#1407](https://github.com/FluidSynth/fluidsynth/issues/1407), [#1408](https://github.com/FluidSynth/fluidsynth/issues/1408)). Always trim to the frame count from the manifest. [H]
- SF3 (Vorbis-compressed SoundFonts) works through libsndfile. [H]

### 2.2 sfizz 1.2.3

Source: [sfztools/sfizz](https://github.com/sfztools/sfizz).

- BSD-2-Clause. The repository is **archived** (last commit 2025-03), so treat it as frozen, not dead. [H]
- There's no Homebrew formula, and the macOS release `sfizz_render` is **x86_64 only**, so it would need Rosetta. The source tarball bundles its dependencies, so an arm64 build should be `cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build --target sfizz_render`. This was **not test-built** (cmake isn't installed yet). [M]
- CLI: `sfizz_render --sfz X.sfz --midi in.mid --wav out.wav [-s 48000] [-q quality] [-p polyphony] [--use-eot]`. Output is 16-bit stereo WAV. [H]
- **One SFZ per render; channel and program changes are ignored.** So write one MIDI file per instrument, render each, then mix. This suits a stem pipeline anyway. SFZ v1 opcode coverage is strong, v2 partial. [H]
- If the arm64 build fails, fall back to Rosetta. If that fails too, use FluidSynth only; GeneralUser GS covers every instrument we need except the VCSL comedy percussion, which can then be triggered as one-shot WAVs in sox. [M]

### 2.3 Tone.js offline in Node

Sources: [ircam-ismm/node-web-audio-api](https://github.com/ircam-ismm/node-web-audio-api), [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js).

- `node-web-audio-api` 2.2.0 is BSD-3 with prebuilt aarch64 binaries, and ships a Tone polyfill. [H]
- Load the polyfill first, then `await import('tone')`, then `Tone.Offline(cb, seconds)`. Read samples with `copyFromChannel`, not `getChannelData`. The helper verified this. [H]
- Tone versions: `latest` 15.1.22 (2025-04-27), `next` 15.5.42 (2026-09-16). For offline rendering, pin 15.1.22. The `next` fixes (TransportTime quantisation #1441, double tick #1444, Player playbackRate #1443) matter mainly for runtime Transport use, which we're avoiding. [H]
- ZzFX 1.3.2 `buildSamples` also runs under this polyfill (verified by the helper). [H]

### 2.4 sox_ng and ffmpeg

- **sox_ng 14.8.1** (Homebrew formula, GPL-2.0-only) is the maintained fork of SoX, since `sox` 14.4.2 dates from 2015. It installs the `sox`/`soxi`/`play`/`rec` binaries and conflicts with the `sox` formula. It's built with libpng (so the `spectrogram` effect works), opus, vorbis, flac and lame ([formula source](https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/s/sox_ng.rb)). [H]
  - Useful effects ([sox_ng](https://codeberg.org/sox_ng/sox_ng)): `bend` (slide whistle, yelps), `pitch`, `speed`, `reverb`, `overdrive`, `echo`, `synth`, `tremolo`, `flanger`, `fade`, `gain`, `norm`, `pad`, `trim`, `silence`.
  - `-R` gives repeatable dither, so builds are deterministic. [H]
- **ffmpeg 9.0.2** (Homebrew, GPL-3.0-or-later) is built with `lame` and `opus` but **not libvorbis** (checked with `brew info --json=v2 ffmpeg`), so encode Opus via `libopus`. [H]
  - Useful filters ([ffmpeg-filters](https://ffmpeg.org/ffmpeg-filters.html)): `loudnorm` (EBU R128, two-pass), `afir` (convolution reverb with an impulse response), `amix`, `acrossfade`, `afade`, `atrim`, `adelay`, `aecho`, `asetrate`. [H]
  - The Homebrew build has no `rubberband`. [M]

---

## 3. Adaptive playback in the browser

### 3.1 Vocabulary (FMOD Studio, Wwise)

Sources: [FMOD Studio docs](https://www.fmod.com/docs/2.03/studio/), [Wwise docs](https://www.audiokinetic.com/en/public-library/). Only partial pages were read. [M]

- **Vertical layering (remixing):** parallel stems of one piece, locked together; intensity changes by fading stems in and out.
- **Horizontal re-sequencing:** jumping between sections or cues at quantised points (next beat or bar). FMOD calls these transition, destination and magnet regions; Wwise calls them entry and exit cues and transition segments.
- **Stingers:** short one-shots played "at next beat / bar / grid / cue" (Wwise) over or instead of the music.

### 3.2 Raw Web Audio is enough, and is the most precise option

Sources: [Web Audio API spec](https://webaudio.github.io/web-audio-api/), [web.dev "A tale of two clocks"](https://web.dev/articles/audio-scheduling), [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay).

- `AudioBufferSourceNode.start(when, offset, duration)` is sample-accurate against `AudioContext.currentTime`. Stems started with the same `when` stay locked for as long as they loop. `loopStart`/`loopEnd` have sub-sample precision and only apply when `0 <= loopStart < loopEnd`; otherwise the whole buffer loops. [H]
- Crossfades: anchor with `setValueAtTime(current, now)` before `linearRampToValueAtTime`. `setTargetAtTime` with a time constant of about fade/3 gives a smooth approach. `cancelAndHoldAtTime` is **not implemented in Firefox**, so avoid it. [H]
- The lookahead scheduler pattern (a timer of about 25 ms scheduling roughly 100 ms ahead, ideally ticked from a Worker) is only needed for event streams. Our events are rare (a state change schedules one start or ramp at the next bar), so plain arithmetic on `currentTime` works. [H for the pattern, M for "not needed"]
- Autoplay: the context starts `suspended`; call `resume()` on the first user gesture (the title screen click). [H]
- Memory: `decodeAudioData` produces Float32 PCM at the context rate. Stereo at 48 kHz is **about 23 MB per decoded minute** (48000 × 2 × 4 × 60). Four stems × 90 s ≈ 138 MB. Decode per region on demand, evict old regions, and keep loops at 60–120 s. [H for the arithmetic]

### 3.3 Libraries

- **Howler 2.2.4** (MIT; last release 2023): `play()` takes no time argument and there's no transport, so **no sample-accurate sync or quantisation**. Fine for fire-and-forget SFX, but it adds nothing over our own tiny SFX pool ([goldfire/howler.js](https://github.com/goldfire/howler.js)). [H] **Don't use it.**
- **Tone.js** covers everything we need at runtime: `getTransport()` (the bare `Transport`, `Destination` and `context` exports are deprecated), `Player.sync().start(0)`, `"@1m"` quantised start times, `nextSubdivision` (returns 0 while the Transport is stopped), `Players`, equal-power `CrossFade`, loop points, and `setContext(nativeCtx)`. But the quantisation fix (#1441) is only in the unstable `next` line. [H] It's viable, but it's a large dependency for what amounts to "start at next bar" arithmetic.
- **orchestre-js 3.1.0** (npm, ISC in `package.json` but no LICENSE file, single author, about 22 stars) does beat-locked vertical layering. It's too small a bus factor. [M]
- **Decision [M]:** a ~200-line `MusicDirector` in `packages/engine` on raw Web Audio. It's deterministic and dependency-free, and it's exactly the adaptive feature set we need.

### 3.4 Sharing one AudioContext with three.js

- Create one native `AudioContext({ sampleRate: 48000 })` at boot. Call `THREE.AudioContext.setContext(ctx)` **before any `AudioListener` exists** ([three `src/audio/AudioContext.js`](https://github.com/mrdoob/three.js/blob/dev/src/audio/AudioContext.js)). [H/M]
- drei `PositionalAudio` creates a **new `AudioListener` per instance** and adds it to the camera ([drei source](https://github.com/pmndrs/drei/blob/master/src/core/PositionalAudio.tsx), read 2026-09-25). For many spatial emitters, use one listener and plain `THREE.PositionalAudio` objects rather than many drei components. [H]
- Route music and SFX through separate `GainNode` buses (music, sfx, ui) into one master bus, so the options menu and ducking work. [M]

### 3.5 How the World states map to the Director [M]

| World event | Mechanism |
|---|---|
| Explore ↔ danger ↔ Combat | Vertical: one cue has stems `bed`, `explore`, `danger`, `combat`, all started at the same `when`. Intensity is a target gain per stem, ramped over one bar and starting at the next bar line. Combat can instead be a separate cue (horizontal) if it needs a new tempo. |
| Day ↔ Night | Horizontal switch at the next bar. Night stems start at `when = nextBar`, `offset = (nextBar - cueStart) mod loopLength`, and Day stems ramp out over one bar. Day and Night variants of a location share tempo, meter, bar count and key, so the offsets line up. |
| Gag begins | Stinger quantised to the **next beat** (comedy wants it tight). The music ducks to silence in about 20 ms at that beat (a hard cut is the gag). |
| Gag → Aftermath | The Aftermath cue starts at `stingerWhen + stinger.exitFrame / sampleRate`, sample-exact. The Aftermath is incongruously genteel: a string-quartet or harpsichord tea-time loop, plus the tea-cup clink as SFX. |
| Respawn | A hard cut (the #5 research says respawn is a hard cut), then the Site of Grace cue. |
| Site of Grace | The chime SFX plays immediately, unquantised. The Grace cue enters at the next bar of the fading music, or at once if there's none. |

The data shape is a cue `manifest.json` entry: `{ id, bpm, beatsPerBar, bars, sampleRate, loopStartFrame, loopEndFrame, stems: {name: url}, variants: {day, night} }`. For stingers: `{ id, quantise: 'beat' | 'bar', exitFrame, then: cueId }`. The Engine owns the types; the Game owns the data (consistent with ADR 0003's data-versus-code split). [M]

---

## 4. SFX

- **jsfxr 1.4.1** ([chr15m/jsfxr](https://github.com/chr15m/jsfxr)): **Unlicense**, even though the npm licence field is empty. `sfxr.toWave()` works headless. The `sfxr-to-wav` CLI defaults to 8-bit, so set `sample_size` to 16. Its presets cover pickup/coin (Rune pickup), laser, explosion, hit/hurt, jump and blip. [H]
- **ZzFX 1.3.2** ([KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX)): MIT. `buildSamples(...params)` runs in Node under the node-web-audio-api polyfill (verified); it needs a small WAV writer. [H]
- **Tone.js offline**: FM bells and shimmer for the Grace chime; noise plus filter sweeps for whooshes (sword swing); MetalSynth for clinks. [M]
- **Layering and processing in sox_ng/ffmpeg**: a sword swing is a noise whoosh (`synth pinknoise` + `bandpass` sweep + `fade`) plus a jsfxr hit. A slide whistle is a sine `synth` + `bend`. The cartoon "sad trombone" is a VSCO 2 CE trombone or muted trumpet rendered from MIDI with pitch bend. [M]
- **Yelps and gibberish (silent-film grammar)**:
  - **Pink Trombone** (MIT; headless port [seleb/pink-trombone](https://github.com/seleb/pink-trombone)) is the most controllable route: glottis pitch and tongue position are just parameters, so scripted yelps, grunts and "hup!" sounds are fully ours. [H/M]
  - **Kokoro-82M** ([hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0, 54 voices) for nonsense syllables, pitch-shifted. [H]
  - **espeak-ng** is GPL, but its output is unrestricted. [H]
  - **Piper** is now `piper1-gpl`, and voice licences vary per voice, so check each. [H]
  - Build our own animalese-style syllable bank; don't reuse animalese.js's CC BY 4.0 source WAV. [H]
  - **Do not use macOS `say`**: the macOS Tahoe SLA §2F forbids recording or publishing system voices, even for non-profit public sharing ([Apple SLAs](https://www.apple.com/legal/sla/)). [H]
  - Design our own Tarnished yelp and our own opening sting; don't imitate Carbot's shriek or horn honk (#5). [M]
- **Raw material, CC0 only, committed only if needed**:
  - **Kenney** audio packs (CC0, no attribution; [kenney.nl](https://kenney.nl/assets)). [H]
  - **Freesound** per-sound CC0 via the API needs an account and OAuth2 for originals; token auth gives previews only, with 2000 requests a day ([API docs](https://freesound.org/docs/api/)). Optional. [H]
  - **OpenGameArt** licences are per asset; take CC0 only. [H]

---

## 5. Formats, loops, loudness, size budget

### 5.1 Formats

- **Masters**: WAV, 48 kHz, 32-bit float, as build artefacts. Keep them in a gitignored cache; don't commit them (like GLBs in ADR 0002). [M]
- **Shipped**: **Ogg Opus** at 48 kHz. Opus runs natively at 48 kHz, and 96–128 kbps stereo is about transparent ([Xiph recommended settings](https://wiki.xiph.org/Opus_Recommended_Settings)). [H]
  - **Safari 18.4** (macOS 15.4+) added the Ogg container for Opus and Vorbis ([WebKit blog](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/), read 2026-09-25); Safari 17 added Opus in WebM/MP4. [H]
  - Whether Safari's `decodeAudioData` accepts Ogg is **unverified**. #16 must test it. Fallback: AAC `.m4a` from ffmpeg's native encoder, chosen via `canPlayType`. MDN's compat table still says "no Vorbis" and is out of date. [M]
- **Don't use MP3 for loops**: there's no standard gapless metadata in `decodeAudioData`, and encoder delay shifts the loop (Firefox only trims it since v83). [H/M]
- **Priming (Opus pre-skip 312 samples, AAC 2112) [M]:** it's unverified whether every browser trims it in `decodeAudioData`. Put the expected frame count in the manifest. At load, compute `offset = decoded.length - expectedFrames` and shift `loopStart`/`loopEnd` by it; this corrects either behaviour.

### 5.2 Seamless loops with reverb tails [M]

1. Render the stem for `bars + tailBars`, so it runs past the loop end.
2. Take the audio after `loopEndFrame` (the tail), mix it onto the start of the loop, then trim to exactly `loopEndFrame` frames.
3. Encode. At runtime, `loop = true` over the whole buffer (plus the priming correction). The loop now carries its own reverb tail across the seam.

### 5.3 Loudness [M]

- Normalise each **cue mix** with a two-pass `loudnorm`. Suggested targets: about -18 LUFS integrated for music beds, stingers about 3 LU hotter, true peak at or below -1 dBTP.
- Then apply **the same gain to every stem** of that cue. Never normalise stems individually, or the layers stop summing to the intended mix.
- SFX are normalised per sound, to a peak target, and balanced on the bus.

### 5.4 Size budget [M, arithmetic]

| Item | Bitrate | Size |
|---|---|---|
| Music stem, stereo | 96 kbps | ~0.72 MB/min |
| One location cue: Day + Night × 4 stems × 90 s | 96 kbps | ~8.6 MB |
| Stinger (5–10 s) | 128 kbps | ~0.1–0.16 MB |
| SFX, mono, short | 48–64 kbps | ~5–30 KB each |

- **First load**: title and Chapel of Anticipation cues, all stingers, and the core SFX. Aim for ≤ 15 MB.
- **Per new region**: lazy-load that region's cue (~9 MB) while its Scene loads.
- **Decoded RAM**: keep it at or below about 300 MB (the current cue, the next region's cue, and stingers).

### 5.5 How the agent checks what it can't hear [M]

- Run `soxi` / `sox --i` for exact frame counts, and assert them against the manifest.
- Run `ffmpeg -af loudnorm=print_format=json` to check loudness and true peak, and `sox stats` for clipping and DC offset.
- Render `sox spectrogram` PNGs; the agent can *look* at these (empty stems, mud, clipping, click at the loop seam).
- Do a seam check: compute RMS of the last and first 10 ms. A large jump means a click.
- The user's ear is the final gate (#16).

---

## 6. Licence posture for sample libraries and SoundFonts

Rendered output is a transformed work in every case below; what differs is attribution and whether raw files may be redistributed in a public repo. We recommend **fetching libraries with a pinned script (URL + SHA-256) into a gitignored cache, never committing them**. Credit every library in a `CREDITS` screen or file, even when not required.

### Use

| Library | Licence | Notes | Source |
|---|---|---|---|
| **GeneralUser GS 2.0.3** (2026-02-22) | Custom: use without restriction, no attribution required [H] | 32 MB SF2. Full GM set incl. tuba, bassoon, pizzicato, timpani, choir, glockenspiel, accordion, organ, whistle, ocarina, SFX kit; no kazoo or slide whistle [H]. The author asks not to hotlink downloads: pin the GitHub raw file at commit `97049183643d5fc5a9322a69c5b09efb667c6c3a` (no tags) [H]. The author is not 100% sure of every sample's provenance [H]. | [mrbumpy409/GeneralUser-GS](https://github.com/mrbumpy409/GeneralUser-GS) |
| **VSCO 2 Community Edition 1.1.0** | **CC0** [H] | SFZ on the `SFZ` branch, ~2.3 GB repo. Tuba, bassoon, trombone, muted trumpet, pizzicato, timpani, glockenspiel, harp, organ, tubular bells, upright piano, percussion. | [sgossner/VSCO-2-CE](https://github.com/sgossner/VSCO-2-CE) |
| **VCSL** | **CC0** [H] | WAV on `master` (~3.9 GB), last SFZ release v1.2.2-RC. **The comedy kit**: slapstick, flexatone, vibraslap, ratchet, anvil, brake drum, toy train whistle, ball whistle, siren, ocarinas, harmonicas, recorders, kalimba, wine glasses. | [sgossner/VCSL](https://github.com/sgossner/VCSL) |
| **Karoryfer** libraries | **CC0** [H] | War Tuba (breath and yell on CC1: very funny), Sneakybass pizzicato, Squidpipes bagpipes, Bear Sax. | [sfzinstruments](https://github.com/sfzinstruments) (`karoryfer.*` repos) |
| **FreePats** Button Accordion HN, Upright Piano KW | **CC0** [H] | Accordion 4.8 MiB. (The FreePats GM set is GPLv3+ with an exception and incomplete, so skip it.) | [freepats.zenvoid.org](https://freepats.zenvoid.org/) |
| **MuseScore_General 0.2.0** | MIT; keep the acknowledgements (Frank Wen, Michael Cowgill, S. Christian Collins, Ethan Winer, Michael Schorsch) [H] | SF2 215 MB, SF3 40 MB; an alternate GM bank. | [osuosl mirror](https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/) |
| **FluidR3_GM 3.1** | MIT; keep the notice [H] | Older GM bank, a fallback. | – |

### Use with attribution

| Library | Licence | Notes |
|---|---|---|
| **Sonatina Symphonic Orchestra v4.0** (2024-12) | Creative Commons Sampling Plus 1.0 (retired licence) [H] | Transformed and commercial output is fine; attribution required; whole-work redistribution only non-commercially. Tuba, bassoons, pizzicato, timpani, glockenspiel, xylophone, harp, chorus, organ, vibraslap, ratchet, woodblocks, castanets. [peastman/sso](https://github.com/peastman/sso) |
| **Salamander Grand Piano V3** | CC BY 3.0 [H] | Only if a real grand is needed. |

### Avoid

- **Arachno SoundFont**: all rights reserved, built from Roland, Korg and Yamaha sounds. [H]
- **Timbres of Heaven** and **SGM**: unclear licences. [L]
- **Virtual Playing Orchestra 3.3**: mixed licences including CC BY-SA. A share-alike argument over rendered output isn't worth having. Its instrument list wasn't verified. [M]
- **Sonniss GDC bundle**: the raw files can't be redistributed standalone (a public repo counts), and its terms forbid AI/ML use. [H]
- **Pixabay** sounds: same standalone-redistribution restriction. [H]
- **BBC RemArc** sound effects: personal and educational use only. [H]
- **macOS `say` voices**: see section 4. [H]
- **MusicGen weights**: CC-BY-NC. [H]
- **Strudel runtime**: AGPL. [H]

**Kazoo and slide whistle:** no free sampled source was found. For the slide whistle, use a sine `synth` + sox `bend`, or the GM Whistle/Ocarina with wide pitch bend. For the kazoo, synthesise a buzz (a sawtooth through a formant/bandpass with vibrato in Tone.js) over a sung-style melody. [L, not verified]

---

## 7. Proposed repo layout and build [M]

```
apps/elden-ring/audio/
  libs.lock.json          # library name, URL, SHA-256, licence, attribution text
  cues/<location>.ts      # scores: tempo, meter, bars, parts per stem, Day/Night variants
  stingers/<gag>.ts
  sfx/<name>.ts           # jsfxr/ZzFX params, Tone graphs, sox layer recipes
  build/                  # fetch.ts, render.ts, mix.ts, encode.ts, check.ts
apps/elden-ring/public/audio/   # encoded .ogg (+ .m4a fallback) + manifest.json  (build output)
.cache/audio/                   # libraries + WAV masters (gitignored)
packages/engine/src/audio/      # MusicDirector, SfxPool, buses, manifest types
```

Scripts: `pnpm audio:fetch` (download and verify libraries), `pnpm audio:build` (score → MIDI → render → mix → loop-fold → loudnorm → encode → manifest), `pnpm audio:check` (frame counts, loudness, seam RMS, spectrogram PNGs).

Whether encoded audio is committed or built in CI is the same open question as for GLBs. Recommendation: commit the encoded `.ogg` files (small, and deploys stay free of native tools), and never commit libraries or masters. [L, a judgement]

---

## 8. Installs

**Homebrew** (all have arm64 bottles; versions from `brew info` on 2026-09-25):

```sh
brew install fluid-synth   # 2.6.1  LGPL-2.1+   MIDI → WAV via SF2
brew install sox_ng        # 14.8.1 GPL-2.0     effects, bend, spectrogram (installs `sox`; conflicts with `sox`)
brew install ffmpeg        # 9.0.2  GPL-3.0+    loudnorm, afir, amix, libopus encode
brew install cmake         # 4.4.3              only to build sfizz_render 1.2.3 from source
```

Building sfizz needs Xcode Command Line Tools (`xcode-select --install`), which are usually present if Homebrew is. [M]

**npm** (devDependencies of the app, or of a small `audio` workspace package; versions from the npm registry):

```sh
pnpm add -D @tonejs/midi@2.0.28 tone@15.1.22 node-web-audio-api@2.2.0 jsfxr@1.4.1 zzfx@1.3.2
```

Optional: `midi-writer-js@3.2.1` (MIT) as an alternative MIDI writer.

**Runtime dependency: none**. The MusicDirector uses raw Web Audio and three's audio classes.

**Python (optional, not needed for the recommended path):** `uv` 0.12.18 (`brew install uv`) plus `pedalboard==0.9.25` (GPL-3.0, arm64 wheels), only if ffmpeg/sox mastering proves insufficient. Other options: `mido==1.3.3` (MIT), `pretty-midi==0.2.11.post0` (MIT), `music21==10.5.0` (BSD-3), `dawdreamer==0.9.0` (GPL-3.0).

**Accounts: none required.** Optional only: a Hugging Face account (Stable Audio Open licence click-through) or a Freesound account (API originals), neither of which the recommended pipeline uses.

---

## 9. Not verified / open for #16

- An arm64 source build of `sfizz_render` 1.2.3. cmake isn't installed, so it wasn't attempted.
- Safari `decodeAudioData` on Ogg Opus, and whether each browser trims Opus/AAC priming.
- Download sizes of FluidR3_GM, SSO and VSCO 2 CE; VPO's instrument list; the exact Timbres of Heaven licence.
- Hosting Vital or Surge in pedalboard/DawDreamer; Stable Audio Open and MusicGen on MPS; ACE-Step's controllability for loopable stems.
- The RemArc licence text itself (summarised from the source page) and the Freesound CC0 filter syntax.
- Full FMOD and Wwise docs pages; Tone 14 → 15 breaking changes beyond the deprecations noted.
- Tone.js runtime CPU cost (moot, since runtime synthesis isn't recommended).
- The quality verdicts in section 1 are judgements until the user hears #16.
