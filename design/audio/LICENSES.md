# Konesans audio — licences and provenance

All music and sound effects in `apps/mobile/assets/audio/` are **original works made for Konesans**.

- **No samples, loops, soundfonts or sample libraries** were used. Every sound is synthesised
  from mathematics in `synth.py` (additive band-limited oscillators, FM, filtered noise,
  a convolution reverb whose impulse response is itself generated noise).
- **No existing melodies** were used. The hooks, chord voicings and jingles in
  `render_music.py` / `render_sfx.py` were written for this app. Chord progressions such as
  IV–V–iii–vi or I–vi–IV–V are common musical vocabulary, not copyrightable material.
- The audio, the render scripts and the review page are covered by the repository's own licence
  (see `apps/mobile/LICENSE`); the owner of this repo holds all rights to them.

## Tools (used to make the files, not shipped in the app)

| Tool | Licence | Use |
| --- | --- | --- |
| Python 3, NumPy, SciPy | PSF / BSD-3-Clause | synthesis and DSP |
| pyloudnorm | MIT | ITU-R BS.1770 loudness measurement |
| matplotlib | PSF-based (matplotlib licence) | waveform images in `review/` |
| FFmpeg (native AAC encoder, libmp3lame) | LGPL-2.1+ / LGPL | encoding to `.m4a` / `.mp3` |

Encoders do not place any licence terms on the audio they produce.

## Shipped code dependency

| Package | Licence |
| --- | --- |
| `expo-audio` | MIT |

## Rebuild

```sh
cd design/audio
pip install --break-system-packages numpy scipy pyloudnorm matplotlib   # once
python3 build.py        # renders, encodes into apps/mobile/assets/audio/, verifies, rebuilds index.html
```

Masters land in `design/audio/out/` (git-ignored).
