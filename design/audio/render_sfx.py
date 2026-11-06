"""Konesans — sound effects. Original, synthesised with synth.py (no samples).

    python3 render_sfx.py [name ...]   → out/wav/sfx_<name>.wav (44.1 kHz mono float)

Loudness: each one-shot is set to a target *max momentary* loudness for its category
(tiny UI < feedback < big moments) and peak-limited at −3.8 dBFS (true peak checked after
encoding in build.py).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

from synth import (SR, Bus, bell, blip, brass, chip, clap, crash, db, ep, fade_edges, filt, fm, hz, kick, lead, limiter,
                   mallet, max_momentary, noise, pan2, perc, reverb_tail, secs, ns, supersaw, true_peak_db, vibrato, whoosh,
                   additive, adsr)

OUT = Path(__file__).parent / 'out' / 'wav'
PEAK_DB = -3.8


def mixer(seconds: float) -> Bus:
    return Bus(seconds)


def sparkle(b: Bus, at: float, count=6, span=0.5, base=96, vel=0.18, seed=1):
    rng = np.random.default_rng(seed)
    scale = [0, 2, 4, 7, 9, 12, 14, 16]
    for i in range(count):
        m = base + scale[rng.integers(0, len(scale))]
        b.add(bell(m, 0.05, vel * (1 - 0.6 * i / count), ratio=3.5, index=1.2, decay=0.18), at + span * i / count + rng.uniform(0, 0.02), 1.0, pan=rng.uniform(-0.6, 0.6))


# ─── the sounds ──────────────────────────────────────────────────────────────
def tap():
    n = ns(0.07)
    t = secs(n)
    f = 1050 * (1 + 0.35 * (1 - np.exp(-t / 0.01)))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * perc(n, 0.014, 0.0008)
    x += 0.25 * np.sin(2 * np.pi * np.cumsum(f * 2.7) / SR) * perc(n, 0.005, 0.0005)
    return fade_edges(x, 0.0008, 0.01), dict(target=-30)


def correct():
    b = mixer(0.9)
    for at, m, d, v in ((0.0, 84, 0.07, 0.8), (0.075, 91, 0.32, 1.0)):
        b.add(chip(m, d, 0.32 * v, shape='pulse', duty=0.5), at)
        b.add(bell(m, d, 0.6 * v, ratio=2.0, index=1.0, decay=0.22), at)
        b.add(mallet(m - 12, d, 0.5 * v, decay=0.18), at)
    sparkle(b, 0.1, count=4, span=0.25, base=100, vel=0.12, seed=3)
    return reverb_tail(b.buf, 0.9, 0.15)[:ns(0.85)], dict(target=-17)


def wrong():
    b = mixer(0.7)
    for at, m, d, bend in ((0.0, 64, 0.11, 0.0), (0.14, 60, 0.3, -2.0)):
        n = ns(d + 0.08)
        t = secs(n)
        f = vibrato(hz(m), n, rate=7, depth_cents=25, delay=0.06, ramp=0.1) * 2 ** (bend * np.clip((t - 0.08) / 0.25, 0, 1) / 12)
        x = additive(f, n, 'square', cutoff=900, kmax=16) * 0.7 + 0.6 * additive(f, n, 'tri', kmax=9)
        b.add(x * adsr(n, 0.006, 0.12, 0.7, 0.07, gate=d), at, 1.0)
    return reverb_tail(b.buf, 0.6, 0.08)[:ns(0.65)], dict(target=-20)


def combo():
    b = mixer(1.1)
    for i, m in enumerate((84, 88, 91, 96, 100)):
        b.add(chip(m, 0.06 if i < 4 else 0.25, 0.3, shape='pulse', duty=0.25), i * 0.05, 1.0, pan=-0.3 + 0.15 * i)
        b.add(bell(m, 0.06, 0.4, ratio=2.0, index=0.9, decay=0.15 if i < 4 else 0.35), i * 0.05, 1.0, pan=-0.3 + 0.15 * i)
    b.add(whoosh(0.3, 800, 9000, 0.35, seed=4), 0.0, 1.0)
    sparkle(b, 0.25, count=7, span=0.45, base=98, vel=0.16, seed=5)
    return reverb_tail(b.buf, 1.0, 0.2)[:ns(1.05)], dict(target=-16)


def tick():
    x = blip(91, 1.0, decay=0.022) + 0.5 * filt(noise(ns(0.132), 2), 'bp', (2000, 6000)) * perc(ns(0.132), 0.003)
    return fade_edges(x, 0.0003, 0.01), dict(target=-23)


def timeup():
    b = mixer(0.8)
    for at, m, d in ((0.0, 57, 0.16), (0.22, 55, 0.3)):
        n = ns(d + 0.1)
        x = 0.5 * additive(hz(m), n, 'square', cutoff=2000, kmax=24) + 0.5 * additive(hz(m) * 1.006, n, 'saw', cutoff=1700, kmax=24)
        b.add(x * adsr(n, 0.008, 0.2, 0.65, 0.08, gate=d), at)
    return reverb_tail(b.buf, 0.7, 0.1)[:ns(0.8)], dict(target=-19)


def vs_slam():
    b = mixer(1.7)
    hit = 0.2
    b.add(whoosh(hit + 0.02, 300, 7000, 0.8, seed=11, rev=True), 0.0, 0.9)
    n = ns(0.9)
    t = secs(n)
    f = 38 + 110 * np.exp(-t / 0.05)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35)
    b.add(np.tanh(2 * boom) * 0.9, hit)
    b.add(filt(noise(ns(0.3), 12), 'bp', (700, 8000)) * perc(ns(0.3), 0.05) * 0.7, hit)
    b.add(crash(1.0, seed=13, decay=0.7), hit, 0.8)
    for m in (43, 50, 55):  # metallic hit + brass power chord
        b.add(fm(hz(m), ns(1.0), 1.41, 3.0, np.exp(-secs(ns(1.0)) / 0.12)) * perc(ns(1.0), 0.4) * 0.25, hit)
        b.add(brass(m + 12, 0.35, 0.45), hit)
    b.add(kick(1.0), hit, 0.8)
    return reverb_tail(b.buf, 1.8, 0.28)[:ns(1.6)], dict(target=-14)


def player_found():
    b = mixer(1.2)
    b.add(whoosh(0.28, 400, 6000, 0.6, seed=21), 0.0, 0.7)
    for m in (67, 71, 74):
        b.add(supersaw(m, 0.09, 0.45, cutoff=4500, d=0.1, s=0.5, r=0.06), 0.24)
        b.add(brass(m, 0.09, 0.4), 0.24)
    for m in (72, 76, 79):
        b.add(supersaw(m, 0.38, 0.5, cutoff=5000, d=0.3, s=0.5, r=0.15), 0.38)
        b.add(brass(m, 0.38, 0.45), 0.38)
    b.add(lead(84, 0.36, 0.6), 0.38)
    b.add(clap(0.8), 0.38, 0.5)
    sparkle(b, 0.42, count=5, span=0.35, base=96, vel=0.15, seed=22)
    return reverb_tail(b.buf, 1.2, 0.18)[:ns(1.15)], dict(target=-16)


def ping():
    b = mixer(0.5)
    for at, v in ((0.0, 1.0), (0.12, 0.3)):
        b.add(fm(hz(86), ns(0.3), 1.0, 0.35, np.exp(-secs(ns(0.3)) / 0.05)) * perc(ns(0.3), 0.07) * v, at)
    return reverb_tail(b.buf, 0.6, 0.1)[:ns(0.45)], dict(target=-24)


def pop():
    n = ns(0.11)
    t = secs(n)
    f = 380 * (1 + 2.4 * (1 - np.exp(-t / 0.018)))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.minimum(1, t / 0.002) * np.exp(-t / 0.03))
    x += 0.2 * filt(noise(n, 31), 'bp', (1500, 5000)) * perc(n, 0.004)
    return fade_edges(x, 0.0002, 0.01), dict(target=-22)


def win():
    b = mixer(2.8)
    st = 0.1  # 16th-note pickup step
    for i, m in enumerate((67, 72, 76)):
        b.add(lead(m, st * 0.85, 0.7, vib=False), i * st)
        b.add(brass(m - 12, st * 0.85, 0.4), i * st)
    big = 0.3
    b.add(kick(1.0), big, 0.8)
    b.add(crash(0.9), big, 0.6)
    for m in (60, 64, 67, 72):
        b.add(brass(m, 0.24, 0.5), big)
        b.add(supersaw(m + 12, 0.24, 0.4, cutoff=5000, d=0.2, s=0.6), big)
    b.add(lead(79, 0.24, 0.85), big)
    for at, m, ch in ((0.6, 81, (65, 69, 72)), (0.75, 83, (67, 71, 74))):
        b.add(lead(m, 0.12, 0.8, vib=False), at)
        for c in ch:
            b.add(brass(c, 0.12, 0.42), at)
        b.add(clap(0.6), at, 0.35)
    fin = 0.9
    b.add(kick(1.0), fin, 0.85)
    b.add(crash(1.0, decay=1.2), fin, 0.7)
    b.add(lead(84, 1.0, 0.95, r=0.5), fin)
    for m in (60, 64, 67, 72, 76):
        b.add(brass(m, 1.0, 0.48, r=0.5), fin)
        b.add(supersaw(m + 12, 1.1, 0.32, cutoff=4500, a=0.01, d=0.6, s=0.6, r=0.4), fin)
    for i, m in enumerate((84, 88, 91, 96)):
        b.add(bell(m, 0.1, 0.35, ratio=2.0, index=1.0, decay=0.4), fin + 0.06 * i, 1.0, pan=-0.4 + 0.25 * i)
    sparkle(b, fin + 0.3, count=8, span=0.9, base=96, vel=0.14, seed=41)
    y = reverb_tail(b.buf, 1.6, 0.22)[:ns(2.6)]
    return fade_edges(y, 0, 0.25), dict(target=-14)


def lose():
    b = mixer(2.4)
    for at, m, d in ((0.0, 76, 0.22), (0.27, 74, 0.22)):
        b.add(chip(m, d, 0.35, shape='tri'), at)
        b.add(ep(m, d, 0.5), at)
    # the "aww": a gentle glide down with a little wobble
    n = ns(0.75)
    t = secs(n)
    f = hz(72) * 2 ** (-3 * np.clip((t - 0.12) / 0.5, 0, 1) ** 1.3 / 12) * 2 ** (20 / 1200 * np.sin(2 * np.pi * 5 * t) * np.clip(t / 0.2, 0, 1))
    aww = additive(f, n, 'tri', kmax=9) + 0.25 * additive(f, n, 'square', cutoff=1500, kmax=12)
    b.add(aww * adsr(n, 0.02, 0.3, 0.8, 0.15, gate=0.62) * 0.55, 0.54)
    # …then a warm, hopeful "you'll get it next time"
    for m in (53, 57, 60, 64):
        b.add(ep(m, 0.7, 0.45), 1.3)
    for at, m in ((1.36, 76), (1.5, 79)):
        b.add(bell(m, 0.2, 0.3, ratio=2.0, index=0.8, decay=0.35), at, 1.0, pan=0.2)
    y = reverb_tail(b.buf, 1.4, 0.2)[:ns(2.2)]
    return fade_edges(y, 0, 0.3), dict(target=-17)


def draw():
    b = mixer(1.5)
    for at in (0.0, 0.16):
        for m in (76, 79):
            b.add(mallet(m, 0.1, 0.6, decay=0.15), at)
            b.add(chip(m, 0.08, 0.2, shape='pulse', duty=0.4), at)
    for m in (67, 72, 74, 79):  # Csus2-ish: open, neither happy nor sad
        b.add(ep(m - 12, 0.55, 0.45), 0.36)
        b.add(bell(m + 12, 0.4, 0.22, ratio=2.0, index=0.8, decay=0.4), 0.36 + 0.03 * (m % 5), 1.0)
    y = reverb_tail(b.buf, 1.2, 0.18)[:ns(1.3)]
    return fade_edges(y, 0, 0.2), dict(target=-17)


def coin():
    b = mixer(0.6)
    for at, m, d in ((0.0, 88, 0.05), (0.06, 95, 0.22)):
        b.add(chip(m, d, 0.3, shape='square'), at)
        b.add(bell(m, d, 0.5, ratio=3.5, index=1.0, decay=0.2), at)
    sparkle(b, 0.1, count=3, span=0.2, base=100, vel=0.1, seed=51)
    return reverb_tail(b.buf, 0.8, 0.12)[:ns(0.55)], dict(target=-18)


def badge():
    b = mixer(2.0)
    run = (72, 74, 76, 79, 81, 84, 86, 88, 91)
    for i, m in enumerate(run):
        b.add(chip(m, 0.04, 0.22 + 0.02 * i, shape='pulse', duty=0.3), i * 0.038, 1.0, pan=-0.5 + i * 0.12)
    b.add(whoosh(0.38, 600, 10000, 0.5, seed=61, rev=True), 0.0, 0.8)
    hit = 0.36
    for i, m in enumerate((84, 88, 91, 96)):
        b.add(bell(m, 0.6, 0.45, ratio=2.0, index=1.1, decay=0.7), hit + 0.012 * i, 1.0, pan=-0.3 + 0.2 * i)
    for m in (60, 64, 67, 72):
        b.add(supersaw(m, 1.0, 0.3, cutoff=3500, a=0.02, d=0.6, s=0.5, r=0.4), hit)
    b.add(crash(0.6, decay=1.0), hit, 0.45)
    b.add(kick(0.8, f_hi=120), hit, 0.5)
    sparkle(b, hit + 0.15, count=10, span=1.1, base=98, vel=0.15, seed=62)
    y = reverb_tail(b.buf, 1.8, 0.25)[:ns(1.9)]
    return fade_edges(y, 0, 0.3), dict(target=-15)


def level_complete():
    b = mixer(2.0)
    st = 0.11
    for i, m in enumerate((72, 76, 79, 84)):
        b.add(mallet(m, st, 0.7, decay=0.2), i * st)
        b.add(chip(m, st * 0.8, 0.28, shape='pulse', duty=0.25), i * st)
    b.add(kick(0.9), 0.0, 0.5)
    b.add(kick(0.9), 2 * st, 0.4)
    at = 4 * st + 0.04
    b.add(lead(79, 0.1, 0.7, vib=False), at)
    b.add(clap(0.7), at, 0.4)
    fin = at + 0.16
    b.add(lead(84, 0.55, 0.85, r=0.4), fin)
    for m in (60, 64, 67, 72):
        b.add(brass(m, 0.55, 0.42, r=0.4), fin)
        b.add(supersaw(m + 12, 0.6, 0.28, cutoff=4500, d=0.4, s=0.6, r=0.3), fin)
    b.add(kick(1.0), fin, 0.7)
    b.add(crash(0.8), fin, 0.5)
    sparkle(b, fin + 0.1, count=7, span=0.6, base=96, vel=0.14, seed=71)
    y = reverb_tail(b.buf, 1.3, 0.2)[:ns(1.8)]
    return fade_edges(y, 0, 0.25), dict(target=-15)


SFX = {
    'tap': tap, 'correct': correct, 'wrong': wrong, 'combo': combo, 'tick': tick, 'timeup': timeup,
    'vs': vs_slam, 'found': player_found, 'ping': ping, 'pop': pop, 'win': win, 'lose': lose, 'draw': draw,
    'coin': coin, 'badge': badge, 'level': level_complete,
}


def finish(x: np.ndarray, target: float) -> np.ndarray:
    m = x.mean(axis=1) if x.ndim == 2 else x
    m = filt(m, 'hp', 60)
    m = m / (np.abs(m).max() + 1e-9) * 0.5
    for _ in range(3):
        g = db(target - max_momentary(m))
        m = limiter(m * g, PEAK_DB, hold=0.004, smooth=0.002)
    # trim trailing near-silence, then a short fade so nothing clicks
    env = np.abs(m)
    last = np.nonzero(env > db(-60))[0]
    if len(last):
        m = m[:min(len(m), last[-1] + ns(0.02))]
    return fade_edges(m, 0.0003, 0.008)


def render(names=None):
    from scipy.io import wavfile
    OUT.mkdir(parents=True, exist_ok=True)
    info = {}
    for name in names or SFX:
        x, meta = SFX[name]()
        y = finish(x, meta['target'])
        wavfile.write(OUT / f'sfx_{name}.wav', SR, y.astype(np.float32))
        info[name] = dict(seconds=round(len(y) / SR, 3), momentary=round(max_momentary(y), 1), tp=round(true_peak_db(y), 2))
        print(name, info[name], flush=True)
    return info


if __name__ == '__main__':
    render(sys.argv[1:] or None)
