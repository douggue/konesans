"""Konesans audio — render everything, encode the shipped files, verify them, build the review page.

    python3 build.py            # render + encode + verify + review page
    python3 build.py --no-render  # just re-encode / re-verify existing WAVs

Outputs
  out/wav/*.wav                        masters (git-ignored, re-creatable)
  ../../apps/mobile/assets/audio/*     shipped files (music .m4a AAC 96 kbps stereo, sfx .mp3 96 kbps mono)
  review/*.png                         waveform per shipped file
  manifest.json, index.html            review page + numbers
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from synth import SR, lufs, true_peak_db  # noqa: E402

WAV = HERE / 'out' / 'wav'
SHIP = HERE.parent.parent / 'apps' / 'mobile' / 'assets' / 'audio'
REVIEW = HERE / 'review'

MUSIC = ['menu', 'duel_search', 'duel_battle', 'duel_hurry']
DESCR = {
    'menu': 'Home loop — calm, bouncy, mallets + bell melody (96 BPM)',
    'duel_search': 'Matchmaking radar — soft pulse, sweeping pings (100 BPM)',
    'duel_battle': 'Duel — punchy casual-game pop, pulse-lead hook (128 BPM)',
    'duel_hurry': 'Last seconds — same key/tempo as battle: 16th pulse, climbing riff, snare build',
    'tap': 'Button tap', 'correct': 'Right answer', 'wrong': 'Wrong answer (soft)', 'combo': 'Streak / combo',
    'tick': 'Countdown tick (last seconds)', 'timeup': 'Time up (soft buzzer)', 'vs': 'VS slam (matchmaking)',
    'found': 'Opponent found', 'ping': 'Opponent answered (subtle)', 'pop': 'Reaction pop', 'win': 'Win fanfare',
    'lose': 'Lose — gentle, encouraging', 'draw': 'Draw', 'coin': 'XP / coin gain', 'badge': 'Trophy unlocked',
    'level': 'Lesson / quiz complete',
}


def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def decode(path: Path, ch: int) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).astype(float)
    return x.reshape(-1, ch) if ch > 1 else x


def wave_png(x: np.ndarray, out: Path, loop: bool):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    m = x.mean(axis=1) if x.ndim == 2 else x
    W = 900
    hop = max(1, len(m) // W)
    k = len(m) // hop
    blk = m[:k * hop].reshape(k, hop)
    hi, lo = blk.max(axis=1), blk.min(axis=1)
    fig = plt.figure(figsize=(9, 1.1), dpi=80)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.fill_between(np.arange(k), lo, hi, color='#1F47B5' if loop else '#E8A400', lw=0)
    ax.axhline(0, color='#00000022', lw=0.5)
    ax.set_xlim(0, k)
    ax.set_ylim(-1, 1)
    ax.axis('off')
    fig.savefig(out, transparent=True)
    plt.close(fig)


def db(x):
    return 10 ** (x / 20)


def main():
    render = '--no-render' not in sys.argv
    if render:
        import render_music
        import render_sfx
        render_music.render()
        render_sfx.render()
    SHIP.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    from scipy.io import wavfile
    manifest = []
    for name in MUSIC:
        src = WAV / f'{name}.wav'
        dst = SHIP / f'{name}.m4a'
        ff('-i', str(src), '-map_metadata', '-1', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', str(dst))
        _, ref = wavfile.read(src)
        y = decode(dst, 2)
        # gapless check: the decoded file must be sample-aligned with the master and the same length
        n = len(ref)
        err = float(np.sqrt(np.mean((y[:n] - ref[:len(y)]) ** 2)) / np.sqrt(np.mean(ref ** 2)))
        wave_png(y, REVIEW / f'{name}.png', True)
        manifest.append(dict(file=dst.name, kind='music', name=name, descr=DESCR[name], seconds=round(n / SR, 3), decoded_samples=len(y), master_samples=n,
                             bytes=dst.stat().st_size, lufs=round(lufs(np.concatenate([y, y])), 1), true_peak=round(true_peak_db(y), 1),
                             rel_err=round(err, 3)))
    for p in sorted(WAV.glob('sfx_*.wav')):
        name = p.stem[4:]
        dst = SHIP / f'sfx_{name}.mp3'
        ff('-i', str(p), '-map_metadata', '-1', '-id3v2_version', '0', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', str(dst))
        y = decode(dst, 1)
        wave_png(y, REVIEW / f'sfx_{name}.png', False)
        manifest.append(dict(file=dst.name, kind='sfx', name=name, descr=DESCR.get(name, name), seconds=round(len(y) / SR, 3), bytes=dst.stat().st_size,
                             true_peak=round(true_peak_db(y), 1)))
    (HERE / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    page(manifest)
    tot_m = sum(m['bytes'] for m in manifest if m['kind'] == 'music')
    tot_s = sum(m['bytes'] for m in manifest if m['kind'] == 'sfx')
    for m in manifest:
        print(f"{m['file']:22} {m['seconds']:7.2f}s {m['bytes'] / 1024:7.1f} KB  TP {m['true_peak']:6.1f}" + (f"  LUFS {m['lufs']}  err {m['rel_err']} samples {m['decoded_samples']}/{m['master_samples']}" if m['kind'] == 'music' else ''))
    print(f'music {tot_m / 1024:.0f} KB, sfx {tot_s / 1024:.0f} KB, total {(tot_m + tot_s) / 1024:.0f} KB')


def page(manifest):
    rows = []
    for m in manifest:
        loop = m['kind'] == 'music'
        stats = f"{m['seconds']:.2f} s · {m['bytes'] / 1024:.1f} KB · peak {m['true_peak']} dBTP" + (f" · {m['lufs']} LUFS" if loop else '')
        rows.append(f'''
    <section class="row{' loop' if loop else ''}">
      <div class="meta"><h3>{m['name']}</h3><p>{m['descr']}</p><p class="num">{stats}</p></div>
      <div class="media"><img src="review/{Path(m['file']).stem}.png" alt="waveform of {m['name']}" loading="lazy">
      <audio controls preload="none" {'loop' if loop else ''} src="../../apps/mobile/assets/audio/{m['file']}"></audio></div>
    </section>''')
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Konesans Audio Review</title>
<style>
:root {{ --bg:#F6F7FB; --card:#fff; --ink:#1B1E2E; --muted:#5B6075; --line:#E1E4EE; --blue:#1F47B5; --gold:#E8A400; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#11131C; --card:#1A1D2A; --ink:#EEF0F7; --muted:#A3A8BC; --line:#2A2E40; }} }}
:root[data-theme="dark"] {{ --bg:#11131C; --card:#1A1D2A; --ink:#EEF0F7; --muted:#A3A8BC; --line:#2A2E40; }}
* {{ box-sizing:border-box }} body {{ margin:0; background:var(--bg); color:var(--ink); font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif }}
main {{ max-width:980px; margin:0 auto; padding:24px 16px 64px }}
h1 {{ font-size:26px; margin:0 0 4px }} h2 {{ font-size:17px; margin:32px 0 10px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em }}
.intro {{ color:var(--muted); margin:0 0 8px; max-width:70ch }}
.row {{ display:grid; grid-template-columns:240px 1fr; gap:16px; align-items:center; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin:8px 0 }}
.row.loop {{ border-left:4px solid var(--blue) }} .row:not(.loop) {{ border-left:4px solid var(--gold) }}
.meta h3 {{ margin:0; font-size:16px }} .meta p {{ margin:2px 0; color:var(--muted); font-size:13px }} .num {{ font-variant-numeric:tabular-nums }}
.media {{ display:grid; gap:6px; min-width:0 }} .media img {{ width:100%; height:56px; object-fit:fill; display:block }} audio {{ width:100% }}
@media (max-width:640px) {{ .row {{ grid-template-columns:1fr }} }}
</style></head><body><main>
<h1>Konesans audio</h1>
<p class="intro">Original music loops and sound effects, synthesised from scratch in <code>design/audio/</code> (no samples, no soundfonts).
Music loops seamlessly (press play — the players loop); level ≈ −18 LUFS. SFX peaks ≤ −3 dBFS. Open this file from the repo so the relative links to
<code>apps/mobile/assets/audio/</code> resolve.</p>
<h2>Music loops</h2>{''.join(r for r, m in zip(rows, manifest) if m['kind'] == 'music')}
<h2>Sound effects</h2>{''.join(r for r, m in zip(rows, manifest) if m['kind'] == 'sfx')}
</main></body></html>
'''
    (HERE / 'index.html').write_text(html)


if __name__ == '__main__':
    main()
