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
