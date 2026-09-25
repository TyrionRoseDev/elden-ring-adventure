# Research: agent-authored adaptive music and SFX pipeline

Resolves GitHub issue #15. Date of research: 2026-09-25. WORK IN PROGRESS: sections below are being filled in.

## Verified so far (local registry queries, 2026-09-25)

### Homebrew (`brew info --json=v2`, arm64_tahoe bottles present for all formulae)

| Formula / cask | Version | Licence |
|---|---|---|
| `fluid-synth` | 2.6.1 | LGPL-2.1-or-later |
| `sox` | 14.4.2 | GPL-2.0-or-later AND LGPL-2.1-or-later |
| `ffmpeg` | 9.0.2 | GPL-3.0-or-later |
| `lame` | 4.0 | LGPL-2.0-or-later |
| `opus-tools` | 0.2 | BSD-2-Clause |
| `vorbis-tools` | 1.4.3 | LGPL/GPL |
| `libsndfile` | 1.2.2 | LGPL-2.1-or-later |
| `uv` | 0.12.18 | Apache-2.0 OR MIT |
| `csound` | 6.18.1 | LGPL-2.1-or-later |
| `timidity` | 2.15.0 | GPL-2.0-or-later |
| `lilypond` | 2.26.0 | GPL-3.0-or-later (+ others) |
| cask `supercollider` | 3.14.1 | – |
| cask `musescore` | 4.7.5 | – |
| `sfizz` | not in Homebrew | – |

### npm (`npm view`)

| Package | Version | Licence |
|---|---|---|
| `tone` | 15.1.22 (`latest`, 2025-04-27); `next` = 15.5.42 (2026-09-16) | MIT |
| `howler` | 2.2.4 (last publish 2023-09) | MIT |
| `zzfx` | 1.3.2 | MIT |
| `jsfxr` | 1.4.1 | (licence field empty on npm) |
| `@strudel/web` / `@strudel/core` | 1.3.0 / 1.2.6 | AGPL-3.0-or-later |
| `@tonejs/midi` | 2.0.28 | MIT |
| `midi-writer-js` | 3.2.1 | MIT |
| `scribbletune` | 5.5.5 | MIT |
| `node-web-audio-api` | 2.2.0 | BSD-3-Clause |
| `standardized-audio-context` | 25.3.77 | MIT |

### PyPI (JSON API)

| Package | Version | Licence |
|---|---|---|
| `mido` | 1.3.3 | MIT |
| `pretty-midi` | 0.2.11.post0 | MIT |
| `music21` | 10.5.0 | BSD-3-Clause |
| `pyfluidsynth` | 1.4.0 | MIT |
| `pedalboard` | 0.9.25 (arm64 wheels) | GPL-3.0 |
| `dawdreamer` | 0.9.0 (arm64 wheels, py3.11+) | GPL-3.0 |
| `soundfile` | 0.14.0 | BSD-3-Clause |
| `pyloudnorm` | 0.2.0 | MIT |
| `stable-audio-tools` | 0.0.20 (py <3.11) | – |

Machine: macOS 26.6.2 arm64, Python 3.14.0, Node 24.14.0; none of fluidsynth/sox/ffmpeg installed yet.

## Sample libraries and SoundFonts (strand findings, to be folded into final doc)

- GeneralUser GS 2.0.3 (2026-02-22), 32 MB SF2, custom licence: use without restriction, no attribution; author asks not to hotlink downloads, so pin GitHub raw at commit 97049183643d5fc5a9322a69c5b09efb667c6c3a. Provenance of all samples not certain per author. Tuba, bassoon, pizz, timpani, choir, glock, accordion, organ, whistle, ocarina, SFX kit; no kazoo/slide whistle. [H]
- FluidR3_GM 3.1: MIT, keep notice. [H]
- MuseScore_General 0.2.0: MIT with acknowledgements kept; SF2 215 MB / SF3 40 MB. [H]
- Sonatina Symphonic Orchestra v4.0 (peastman/sso): CC Sampling Plus 1.0; transformed output OK incl. commercial; attribution. [H]
- VSCO 2 CE 1.1.0: CC0, SFZ branch, ~2.3 GB. [H]
- VCSL: CC0; slapstick, flexatone, vibraslap, ratchet, anvil, brake drum, toy train whistle, siren, ocarinas, harmonicas, recorders, kalimba. [H]
- Karoryfer: CC0 (War Tuba, Sneakybass, Squidpipes, Bear Sax). [H]
- FreePats Button Accordion HN, Upright Piano KW: CC0. [H]
- Salamander Grand V3: CC BY 3.0. [H]
- Avoid: Arachno (all rights reserved), Timbres of Heaven, SGM (unclear). [H/L]
- sfizz 1.2.3 BSD-2, repo archived, macOS sfizz_render x86_64 only; one SFZ per render. [H/M]
- FluidSynth 2.6.1: `fluidsynth -ni -q -F out.wav -r 48000 -g 0.5 -R 1 -C 0 -O float -T wav font.sf2 song.mid`; gain clipping ~0.4 with GeneralUser (#1405); ~2-3 s tail (#1433); no normalise/stop-at-EOT (#1407/#1408). [H]

## Runtime strand findings (to fold into final doc)

- Web Audio `start(when, offset, duration)` sample-accurate; stems started at same `when` stay locked; loop points valid only when 0 <= loopStart < loopEnd. [H]
- Anchor ramps with setValueAtTime; `cancelAndHoldAtTime` not in Firefox. [H]
- Decoded PCM is Float32: stereo 48 kHz ~23 MB/min. Decode on demand, evict. [H]
- Tone.js latest 15.1.22 vs next 15.5.42 (fixes #1441 quantisation, #1444 double tick, #1443 playbackRate). Use getTransport(); `"@1m"` quantise; nextSubdivision; Players; CrossFade; setContext(nativeCtx). [H]
- Howler 2.2.4: no time arg to play(), no transport; SFX only. [H]
- Safari 18.4 added Ogg Opus/Vorbis; Safari decodeAudioData Ogg unverified. Avoid MP3 for loops. Opus 96-128 kbps transparent. [H/M]
- THREE.AudioContext.setContext before any AudioListener; drei PositionalAudio makes own listener. [H/M]
- orchestre-js 3.1.0 small single-author; otherwise Tone.js is the base. [M]
