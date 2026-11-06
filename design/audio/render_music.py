"""Konesans — music loops. Original compositions, rendered entirely by synth.py.

Each loop is rendered as one *periodic* cycle (note tails wrap onto the start; effects run on
three tiled copies and the middle copy is kept), so the loop point is seamless. Loop lengths
are rounded to a multiple of 1024 samples (one AAC frame) by nudging the tempo a hair.

    python3 render_music.py [name ...]   → out/wav/<name>.wav (44.1 kHz stereo float)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

from synth import (SR, Bus, bass, bell, blip, brass, chip, circular, clap, crash, db, delay, ep, filt, hat, kick, lead,
                   limiter, lufs, mallet, pad, pluck, reverb, shaker, sidechain, snare, supersaw, tom, true_peak_db, whoosh)

OUT = Path(__file__).parent / 'out' / 'wav'
MUSIC_LUFS = -18.0

CH = {
    'C': [60, 64, 67], 'Am': [57, 60, 64], 'F': [57, 60, 65], 'G': [59, 62, 67], 'Em': [59, 64, 67], 'Dm': [57, 62, 65],
    'G/F': [57, 60, 65], 'Am/G': [57, 60, 64],
    'Am9': [57, 60, 64, 67, 71], 'Fmaj9': [53, 57, 60, 64, 67], 'Cadd9/G': [55, 60, 62, 64, 67], 'Gsus4': [55, 60, 62, 67], 'Gs': [55, 59, 62, 67],
}
ROOT = {'C': 36, 'Am': 45, 'F': 41, 'G': 43, 'Em': 40, 'Dm': 38, 'G/F': 43, 'Am/G': 43,
        'Am9': 45, 'Fmaj9': 41, 'Cadd9/G': 43, 'Gsus4': 43, 'Gs': 43}


def loop_len(bars: int, bpm: float, beats=4):
    n = bars * beats * 60 / bpm * SR
    n = int(round(n / 1024)) * 1024
    return n, bars * beats * 60 * SR / n


def hum(i: int, amt=0.004) -> float:
    """Deterministic tiny timing offset (same every cycle)."""
    return amt * np.sin(i * 12.9898) * 0.5


class Song:
    def __init__(self, bars, bpm):
        self.n, self.bpm = loop_len(bars, bpm)
        self.beat = 60 / self.bpm
        self.bar = 4 * self.beat
        self.buses: dict[str, Bus] = {}
        self.kicks: list[float] = []

    def bus(self, name) -> Bus:
        if name not in self.buses:
            self.buses[name] = Bus(n=self.n, periodic=True)
        return self.buses[name]

    def t(self, bar, eighth=0.0):
        return bar * self.bar + eighth * self.beat / 2

    def mix(self, fx: dict, gains: dict, sc_depth: dict, tilt_hp=35):
        total = np.zeros((self.n, 2))
        sc = sidechain(self.n, self.kicks, depth=1.0, release=0.14) if self.kicks else np.ones(self.n)
        for name, b in self.buses.items():
            x = b.buf
            if name in fx:
                x = circular(fx[name], x)
            d = sc_depth.get(name, 0)
            if d:
                x = x * (1 - d * (1 - sc))[:, None]
            total += x * gains.get(name, 1.0)
        total = circular(lambda y: filt(y, 'hp', tilt_hp), total)
        return total


def master(x: np.ndarray, target=MUSIC_LUFS) -> np.ndarray:
    # gentle glue: soft-saturate the loudest moments, then loudness-normalise + limit (periodic-safe)
    x = x / (np.abs(x).max() + 1e-9) * 0.7
    for _ in range(3):
        g = db(target - lufs(np.concatenate([x, x])))
        x = circular(lambda y: limiter(y * g, -1.5), x)
    return x


# ─── tracks ──────────────────────────────────────────────────────────────────
def battle():
    """duel_battle — 128 BPM, punchy casual-game pop: four-on-the-floor, octave bass, saw stabs, pulse-lead hook."""
    s = Song(16, 128)
    prog = ['F', 'G', 'Em', 'Am'] * 3 + ['Dm', 'Em', 'F', 'G']
    prog = ['F', 'G', 'Em', 'Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'Em', 'Am', 'Dm', 'Em', 'F', 'G']
    D, Bs, St, Pd, Ar, Ld, Fx = (s.bus(k) for k in ('drums', 'bass', 'stab', 'pad', 'arp', 'lead', 'fx'))
    K = kick(1.0)
    C = clap(1.0)
    for b in range(16):
        last = b in (7, 15)
        for q in range(4):
            if b == 15 and q == 3:
                break
            tt = s.t(b, q * 2)
            D.add(K, tt, 0.95)
            s.kicks.append(tt)
            if q in (1, 3) and not (b == 7 and q == 3):
                D.add(C, tt + hum(b * 4 + q), 0.75)
        for k in range(16):
            if b == 15 and k >= 12:
                break
            v = [0.35, 0.18, 0.75, 0.22][k % 4]
            D.add(hat(v, seed=40 + k % 4), s.t(b, k / 2) + hum(b * 16 + k, 0.006), 0.8, pan=0.25)
        if b % 2 == 1 and not last:
            D.add(hat(0.6, open_=True), s.t(b, 7), 0.6, pan=0.25)
        if b in (0, 8):
            D.add(crash(0.9), s.t(b), 0.7, pan=-0.2)
        if b == 7:  # small tom fill on beat 4
            for i, m in enumerate((55, 52, 48, 45)):
                D.add(tom(m, 0.8), s.t(b, 6 + i * 0.5), 0.55, pan=0.3 - 0.2 * i)
        if b == 15:  # snare roll into the top
            for i in range(8):
                D.add(snare(0.35 + 0.08 * i, seed=60 + i), s.t(b, 6 + i * 0.25), 0.6)
    # bass: octave 8ths
    for b, c in enumerate(prog):
        r = ROOT[c]
        for e in range(8):
            if b == 15 and e >= 6:
                Bs.add(bass(r + (7 if e == 6 else 12), s.beat / 2 * 0.8, 0.9), s.t(b, e), 1.0)
                continue
            m = r if e % 2 == 0 else r + 12
            Bs.add(bass(m, s.beat / 2 * (0.85 if e % 2 == 0 else 0.6), 1.0 if e % 2 == 0 else 0.8, bright=1100), s.t(b, e), 1.0)
    # off-beat saw stabs + pad
    for b, c in enumerate(prog):
        notes = CH[c]
        for e in (1, 3, 5, 7):
            for m in notes:
                St.add(supersaw(m + 12, 0.11, 0.55, cutoff=4200, d=0.12, s=0.3, r=0.06, kmax=18, seed=b), s.t(b, e), 1.0)
        for m in notes:
            Pd.add(pad(m, s.bar * 0.98, 0.5, cutoff=1500, seed=b), s.t(b), 1.0)
    # chip arp (B section)
    for b in range(8, 16):
        notes = CH[prog[b]]
        seq = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[0] + 24]
        seq = seq + seq[::-1][1:3]
        for k in range(16):
            Ar.add(chip(seq[k % len(seq)] + 12, s.beat / 4 * 0.7, 0.32, shape='pulse', duty=0.3), s.t(b, k / 2), 1.0, pan=0.35)
    # lead hook
    A1 = [
        [(0, 1, 72), (1, 1, 69), (2, 2, 72), (4, 2, 77), (6, 1, 76), (7, 1, 77)],
        [(0, 3, 79), (3, 1, 74), (4, 2, 71), (6, 2, 74)],
        [(0, 1, 76), (1, 1, 79), (2, 2, 83), (4, 1, 81), (5, 1, 79), (6, 2, 76)],
        [(0, 2, 81), (2, 1, 76), (3, 1, 79), (4, 4, 81)],
    ]
    A2 = [A1[0], A1[1], [(0, 1, 76), (1, 1, 79), (2, 2, 83), (4, 2, 86), (6, 1, 84), (7, 1, 83)], [(0, 3, 84), (3, 1, 83), (4, 4, 81)]]
    Bm = [
        [(0, 1, 77), (1, 1, 77), (2, 1, 81), (3, 3, 84), (6, 2, 81)],
        [(0, 1, 79), (1, 1, 79), (2, 1, 83), (3, 3, 86), (6, 2, 83)],
        [(0, 2, 83), (2, 2, 79), (4, 2, 76), (6, 2, 79)],
        [(0, 2, 81), (2, 2, 84), (4, 2, 83), (6, 2, 81)],
        [(0, 1, 77), (1, 1, 81), (2, 2, 86), (4, 1, 84), (5, 1, 81), (6, 2, 77)],
        [(0, 1, 79), (1, 1, 83), (2, 2, 88), (4, 1, 86), (5, 1, 83), (6, 2, 79)],
        [(0, 2, 81), (2, 2, 84), (4, 1, 81), (5, 1, 84), (6, 2, 86)],
        [(0, 2, 83), (2, 4, 86)],
    ]
    for b, bar in enumerate(A1 + A2 + Bm):
        for pos, ln, m in bar:
            dur = ln * s.beat / 2 * 0.9
            Ld.add(lead(m, dur, 0.8, duty=0.25), s.t(b, pos), 1.0, pan=-0.05)
            if b >= 8:  # brass double an octave down in the B section
                Ld.add(brass(m - 12, dur, 0.45), s.t(b, pos), 0.8, pan=0.1)
            if 4 <= b < 8:
                Ld.add(bell(m + 12, dur, 0.18, decay=0.25), s.t(b, pos), 1.0, pan=0.3)
    # riser into bar 9 and into the loop top
    for b in (7, 15):
        Fx.add(whoosh(s.bar * 0.5, 300, 7000, 0.6, seed=b), s.t(b, 4), 0.5)
    fx = {
        'lead': lambda y: delay(reverb(y, 1.4, 0.18), s.beat * 0.75, fb=0.3, mix=0.16),
        'arp': lambda y: delay(y, s.beat * 0.75, fb=0.35, mix=0.3),
        'stab': lambda y: reverb(y, 1.0, 0.15),
        'pad': lambda y: reverb(filt(y, 'hp', 200), 2.0, 0.3),
        'drums': lambda y: reverb(y, 0.8, 0.07),
        'fx': lambda y: reverb(y, 1.8, 0.3),
    }
    gains = {'drums': 1.0, 'bass': 0.55, 'stab': 0.32, 'pad': 0.16, 'arp': 0.14, 'lead': 0.42, 'fx': 0.3}
    sc = {'bass': 0.45, 'stab': 0.35, 'pad': 0.55, 'arp': 0.25}
    return s, s.mix(fx, gains, sc)


def hurry():
    """duel_hurry — same tempo/key as battle; dominant pedal, 16th pulse, climbing riff, snare build."""
    s = Song(4, 128)
    prog = ['G', 'G/F', 'G', 'Am/G']
    D, Bs, St, Ar, Fx, Tk = (s.bus(k) for k in ('drums', 'bass', 'stab', 'arp', 'fx', 'tick'))
    K = kick(1.0)
    for b in range(4):
        for q in range(4):
            tt = s.t(b, q * 2)
            D.add(K, tt, 1.0)
            s.kicks.append(tt)
            if q in (1, 3):
                D.add(clap(), tt, 0.7)
        for k in range(16):
            D.add(hat([0.45, 0.25, 0.7, 0.3][k % 4], seed=50 + k % 4), s.t(b, k / 2), 0.8, pan=0.25)
        if b == 0:
            D.add(crash(0.9), s.t(0), 0.65, pan=-0.2)
        if b >= 2:  # snare build
            step = 1 if b == 2 else 0.5
            for i in range(int(8 / step)):
                D.add(snare(0.25 + (b - 2) * 0.25 + 0.03 * i, seed=70 + i), s.t(b, i * step), 0.5, pan=0.05)
        for e in range(8):  # tick-tock clock
            Tk.add(blip(96 if e % 2 == 0 else 91, 0.5, decay=0.02), s.t(b, e), 1.0, pan=-0.35 if e % 2 else 0.35)
    for b, c in enumerate(prog):
        for k in range(16):
            Bs.add(bass(43 if k % 4 else 31 + 12, s.beat / 4 * 0.7, 0.9 if k % 4 == 0 else 0.7, bright=1300, decay=0.06), s.t(b, k / 2), 1.0)
        for e in range(8):
            for m in CH[c]:
                St.add(supersaw(m + 12, 0.09, 0.6 if e % 2 else 0.4, cutoff=4500, d=0.1, s=0.3, r=0.05, kmax=18, seed=b), s.t(b, e), 1.0)
    riffs = [[79, 74, 79, 83], [81, 77, 81, 84], [83, 79, 83, 86], [84, 81, 84, 88]]
    for b, r in enumerate(riffs):
        for k in range(16):
            Ar.add(chip(r[k % 4], s.beat / 4 * 0.75, 0.45 if k % 4 == 0 else 0.32, shape='pulse', duty=0.25), s.t(b, k / 2), 1.0, pan=-0.15)
    Fx.add(whoosh(s.bar * 0.98, 250, 8000, 0.7, seed=3), s.t(3), 0.6)
    fx = {
        'arp': lambda y: delay(reverb(y, 0.9, 0.12), s.beat * 0.75, fb=0.25, mix=0.18),
        'stab': lambda y: reverb(y, 0.9, 0.12),
        'drums': lambda y: reverb(y, 0.7, 0.06),
        'fx': lambda y: reverb(y, 1.5, 0.3),
        'tick': lambda y: reverb(y, 0.6, 0.1),
    }
    gains = {'drums': 1.0, 'bass': 0.5, 'stab': 0.26, 'arp': 0.34, 'fx': 0.32, 'tick': 0.22}
    sc = {'bass': 0.45, 'stab': 0.35, 'arp': 0.15}
    return s, s.mix(fx, gains, sc)


def search():
    """duel_search — 100 BPM matchmaking radar: soft pulse, sweeping pings, airy pad, sparse bells."""
    s = Song(8, 100)
    prog = ['Am9', 'Am9', 'Fmaj9', 'Fmaj9', 'Cadd9/G', 'Cadd9/G', 'Gsus4', 'Gs']
    D, Bs, Pd, Bl, Pg, Fx = (s.bus(k) for k in ('drums', 'bass', 'pad', 'bell', 'ping', 'fx'))
    K = kick(0.8, f_hi=120, decay=0.25, click=0.2)
    for b in range(8):
        for q in range(4):
            tt = s.t(b, q * 2)
            D.add(K, tt, 0.75)
            s.kicks.append(tt)
            if q == 3:
                D.add(clap(0.5, decay=0.08), tt, 0.35)
        for k in range(16):
            D.add(shaker([0.6, 0.3, 0.8, 0.35][k % 4], seed=80 + k % 4), s.t(b, k / 2) + hum(b * 16 + k, 0.006), 0.8, pan=0.3)
            if k % 4 == 2:
                D.add(hat(0.5, seed=90), s.t(b, k / 2), 0.55, pan=-0.25)
        # radar ping each bar, sweeping across the stereo field
        Pg.add(bell(93, 0.2, 0.55, ratio=1.0, index=0.4, decay=0.35), s.t(b), 1.0, pan=[-0.5, 0.5][b % 2])
        if b % 2 == 1:
            Fx.add(whoosh(s.bar * 0.9, 200, 3500, 0.5, seed=10 + b), s.t(b, 0.5), 0.35)
    for b, c in enumerate(prog):
        r = ROOT[c]
        for e in range(8):
            Bs.add(bass(r, s.beat / 2 * 0.55, 0.8 if e % 2 else 0.95, bright=600, decay=0.07), s.t(b, e), 1.0)
        if b % 2 == 0 or c != prog[b - 1]:
            span = 2 if (b + 1 < 8 and prog[b + 1] == c) else 1
            for m in CH[c]:
                Pd.add(pad(m, s.bar * span * 0.97, 0.55, cutoff=1300, seed=b), s.t(b), 1.0)
        tones = CH[c][1:] + [CH[c][1] + 12]
        for i, k in enumerate((0, 3, 6, 10, 12)):
            Bl.add(bell(tones[(i + b) % len(tones)] + 12, 0.25, 0.35 if i else 0.45, ratio=3.5, index=1.6, decay=0.4), s.t(b, k / 2), 1.0, pan=0.4 - 0.2 * i)
    fx = {
        'ping': lambda y: delay(reverb(y, 2.2, 0.3), s.beat * 0.75, fb=0.45, mix=0.4),
        'bell': lambda y: delay(reverb(y, 1.8, 0.25), s.beat * 0.75, fb=0.3, mix=0.25),
        'pad': lambda y: reverb(filt(y, 'hp', 180), 2.5, 0.35),
        'drums': lambda y: reverb(y, 0.9, 0.08),
        'fx': lambda y: reverb(y, 2.0, 0.3),
    }
    gains = {'drums': 0.85, 'bass': 0.5, 'pad': 0.3, 'bell': 0.22, 'ping': 0.2, 'fx': 0.2}
    sc = {'bass': 0.5, 'pad': 0.35}
    return s, s.mix(fx, gains, sc)


def menu():
    """menu — 96 BPM, calm and bouncy: mallet comping, pluck bass, soft bell/chip melody."""
    s = Song(16, 96)
    prog = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G']
    D, Bs, Cm, Pd, Ld = (s.bus(k) for k in ('drums', 'bass', 'comp', 'pad', 'lead'))
    K = kick(0.7, f_hi=110, decay=0.22, click=0.15)
    for b in range(16):
        for q in range(4):
            tt = s.t(b, q * 2)
            if q in (0, 2):
                D.add(K, tt, 0.7)
                s.kicks.append(tt)
            else:
                D.add(clap(0.45, decay=0.07, seed=20 + q), tt + hum(b * 4 + q), 0.3)
                D.add(blip(84, 0.4, decay=0.015), tt, 0.25, pan=0.2)
        for k in range(8):
            D.add(shaker([0.5, 0.75][k % 2], seed=30 + k % 2), s.t(b, k) + hum(b * 8 + k, 0.007), 0.75, pan=0.35)
    for b, c in enumerate(prog):
        r = ROOT[c]
        for pos, ln, iv, v in ((0, 2.6, 0, 1.0), (3, 0.8, 7, 0.7), (4, 1.6, 0, 0.9), (6, 0.8, 12, 0.7), (7, 0.8, 7, 0.6)):
            Bs.add(pluck(r + iv, ln * s.beat / 2, v, shape='saw', bright=1200, decay=0.08, kmax=30), s.t(b, pos), 1.0)
        for pos, v in ((0, 0.8), (3, 0.6), (6, 0.65)):
            for j, m in enumerate(CH[c]):
                Cm.add(mallet(m + 12, 0.3, v, decay=0.28), s.t(b, pos) + 0.004 * j, 1.0, pan=-0.2 + 0.2 * j)
        for m in CH[c]:
            Pd.add(pad(m, s.bar * 0.98, 0.4, cutoff=1100, seed=b), s.t(b), 1.0)
    mel = [
        [(0, 2, 76), (2, 2, 79), (4, 2, 76), (6, 2, 72)],
        [(0, 2, 69), (2, 2, 72), (4, 4, 76)],
        [(0, 2, 77), (2, 1, 76), (3, 1, 74), (4, 2, 72), (6, 2, 69)],
        [(0, 2, 71), (2, 2, 74), (4, 4, 79)],
        [(0, 2, 76), (2, 2, 79), (4, 2, 84), (6, 1, 83), (7, 1, 81)],
        [(0, 2, 81), (2, 2, 79), (4, 4, 76)],
        [(0, 1, 77), (1, 1, 79), (2, 2, 81), (4, 1, 79), (5, 1, 77), (6, 2, 74)],
        [(0, 2, 71), (2, 1, 72), (3, 1, 74), (4, 4, 67)],
        [(0, 2, 84), (2, 2, 81), (4, 2, 77), (6, 2, 81)],
        [(0, 2, 83), (2, 2, 79), (4, 4, 74)],
        [(0, 2, 76), (2, 2, 79), (4, 2, 83), (6, 2, 79)],
        [(0, 4, 81), (4, 4, 76)],
        [(0, 2, 77), (2, 2, 81), (4, 2, 86), (6, 2, 84)],
        [(0, 2, 83), (2, 1, 81), (3, 1, 79), (4, 4, 74)],
        [(0, 2, 76), (2, 2, 79), (4, 4, 84)],
        [(0, 2, 74), (2, 2, 79)],
    ]
    for b, bar in enumerate(mel):
        for pos, ln, m in bar:
            dur = ln * s.beat / 2 * 0.85
            Ld.add(bell(m, dur, 0.5, ratio=2.0, index=1.2, decay=0.45), s.t(b, pos), 1.0, pan=-0.1)
            Ld.add(chip(m, dur, 0.22, shape='tri'), s.t(b, pos), 1.0, pan=0.1)
    fx = {
        'lead': lambda y: delay(reverb(y, 1.8, 0.25), s.beat * 0.75, fb=0.3, mix=0.2),
        'comp': lambda y: reverb(y, 1.4, 0.2),
        'pad': lambda y: reverb(filt(y, 'hp', 200), 2.5, 0.35),
        'drums': lambda y: reverb(y, 1.0, 0.1),
    }
    gains = {'drums': 0.8, 'bass': 0.6, 'comp': 0.3, 'pad': 0.12, 'lead': 0.4}
    sc = {'pad': 0.3, 'bass': 0.2}
    return s, s.mix(fx, gains, sc)


TRACKS = {'duel_battle': battle, 'duel_hurry': hurry, 'duel_search': search, 'menu': menu}


def render(names=None):
    from scipy.io import wavfile
    OUT.mkdir(parents=True, exist_ok=True)
    info = {}
    for name in names or TRACKS:
        song, x = TRACKS[name]()
        y = master(x)
        wavfile.write(OUT / f'{name}.wav', SR, y.astype(np.float32))
        info[name] = dict(seconds=len(y) / SR, bpm=round(song.bpm, 3), lufs=round(lufs(np.concatenate([y, y])), 2), tp=round(true_peak_db(y), 2),
                          seam=float(np.abs(y[0] - y[-1]).max()))
        print(name, info[name], flush=True)
    return info


if __name__ == '__main__':
    render(sys.argv[1:] or None)
