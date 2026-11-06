"""Konesans audio — tiny synthesis toolkit (numpy/scipy only, no samples).

Everything here is generated from maths: band-limited additive oscillators, FM bells,
noise-based drums, a convolution reverb with a synthetic impulse response, and a
look-ahead peak limiter. Written for the Konesans sound set (see render_music.py /
render_sfx.py). Public domain / same licence as the repo.
"""
from __future__ import annotations

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 44100


# ─── basics ──────────────────────────────────────────────────────────────────
def hz(m: float) -> float:
    """MIDI note number → Hz."""
    return 440.0 * 2 ** ((m - 69) / 12)


def secs(n: int) -> np.ndarray:
    return np.arange(n) / SR


def ns(s: float) -> int:
    return max(1, int(round(s * SR)))


def noise(n: int, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(n)


def db(x: float) -> float:
    return 10 ** (x / 20)


def sos(kind: str, f, order=2):
    if kind in ('bp', 'bs'):
        return signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype='bandpass' if kind == 'bp' else 'bandstop', output='sos')
    return signal.butter(order, f / (SR / 2), btype={'lp': 'low', 'hp': 'high'}[kind], output='sos')


def filt(x: np.ndarray, kind: str, f, order=2) -> np.ndarray:
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def fade_edges(x: np.ndarray, fin=0.0005, fout=0.004) -> np.ndarray:
    x = x.copy()
    a, b = ns(fin), ns(fout)
    if a > 1:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b > 1:
        x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


# ─── envelopes ───────────────────────────────────────────────────────────────
def adsr(n: int, a=0.005, d=0.12, s=0.7, r=0.08, gate: float | None = None, curve=4.0) -> np.ndarray:
    """Attack/decay/sustain/release. `gate` = seconds the key is held; total length n includes release."""
    t = secs(n)
    if gate is None:
        gate = max(a, n / SR - r)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) * curve / max(d, 1e-6)))
    gi = min(n - 1, ns(gate))
    lvl = e[gi]
    rel = lvl * np.exp(-(t - gate) * 6.0 / max(r, 1e-6))
    e = np.where(t < gate, e, rel)
    return fade_edges(e, 0, 0.003)


def perc(n: int, decay: float, a=0.001) -> np.ndarray:
    t = secs(n)
    e = np.minimum(1, t / max(a, 1e-6)) * np.exp(-t / decay)
    return fade_edges(e, 0, 0.003)


# ─── oscillators ─────────────────────────────────────────────────────────────
def _freq_arr(f, n):
    return np.full(n, float(f)) if np.isscalar(f) else np.asarray(f, float)


def vibrato(f: float, n: int, rate=5.5, depth_cents=18, delay=0.12, ramp=0.15) -> np.ndarray:
    t = secs(n)
    amt = np.clip((t - delay) / ramp, 0, 1)
    return f * 2 ** (depth_cents / 1200 * amt * np.sin(2 * np.pi * rate * t))


def additive(freq, n: int, shape='saw', cutoff=None, kmax=48, duty=0.5, phase0=0.0, slope=4) -> np.ndarray:
    """Band-limited oscillator built from harmonics; `cutoff` (Hz, scalar or per-sample array)
    applies a smooth low-pass on the harmonic amplitudes (so filter sweeps are free)."""
    f = _freq_arr(freq, n)
    ph = 2 * np.pi * np.cumsum(f) / SR + phase0
    K = int(max(1, min(kmax, (SR * 0.45) // max(f.max(), 1))))
    out = np.zeros(n)
    for k in range(1, K + 1):
        if shape == 'saw':
            a = 1 / k
        elif shape == 'square':
            a = (1 / k) if k % 2 else 0
        elif shape == 'pulse':
            a = np.sin(np.pi * k * duty) / k
        elif shape == 'tri':
            a = ((-1) ** ((k - 1) // 2)) / k ** 2 if k % 2 else 0
        elif shape == 'sine':
            a = 1 if k == 1 else 0
        else:
            raise ValueError(shape)
        if a == 0:
            continue
        if cutoff is not None:
            g = 1 / np.sqrt(1 + ((k * f) / cutoff) ** slope)
            out += a * g * np.sin(k * ph)
        else:
            out += a * np.sin(k * ph)
    return out


def fm(freq, n: int, ratio=1.0, index=1.0, index_env=None, fb_phase=0.0) -> np.ndarray:
    f = _freq_arr(freq, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    I = index * (index_env if index_env is not None else 1)
    return np.sin(ph + I * np.sin(ratio * ph + fb_phase))


# ─── instruments (mono, return np.ndarray) ───────────────────────────────────
def lead(m: float, dur: float, vel=1.0, duty=0.25, bright=4200, vib=True) -> np.ndarray:
    """Chiptune-meets-modern pulse lead (soft-edged, vibrato)."""
    n = ns(dur + 0.12)
    f0 = hz(m)
    f = vibrato(f0, n, depth_cents=14) if vib and dur > 0.25 else np.full(n, f0)
    cut = bright * (0.75 + 0.25 * np.exp(-secs(n) / 0.15))
    x = additive(f, n, 'pulse', cutoff=cut, duty=duty, kmax=40) * 0.9
    x += 0.35 * additive(f * 0.5, n, 'tri', kmax=9)
    return x * adsr(n, 0.004, 0.18, 0.72, 0.09, gate=dur) * vel


def pluck(m: float, dur: float, vel=1.0, shape='saw', bright=3200, decay=0.18, kmax=36, detune=0.0) -> np.ndarray:
    n = ns(dur + 0.25)
    t = secs(n)
    f0 = hz(m)
    cut = f0 * 1.2 + bright * np.exp(-t / decay)
    x = additive(f0 * 2 ** (detune / 1200), n, shape, cutoff=cut, kmax=kmax)
    return x * adsr(n, 0.002, decay * 2.2, 0.25, 0.12, gate=dur) * vel


def supersaw(m: float, dur: float, vel=1.0, voices=5, cents=16, cutoff=3500, a=0.004, d=0.25, s=0.45, r=0.12, kmax=22, seed=0):
    """Returns stereo (n,2) detuned saw stack."""
    n = ns(dur + r + 0.05)
    out = np.zeros((n, 2))
    f0 = hz(m)
    rng = np.random.default_rng(seed + int(m * 7))
    t = secs(n)
    cut = cutoff * (0.6 + 0.4 * np.exp(-t / 0.12))
    for v in range(voices):
        det = (v - (voices - 1) / 2) / max(1, (voices - 1) / 2) * cents
        x = additive(f0 * 2 ** (det / 1200), n, 'saw', cutoff=cut, kmax=kmax, phase0=rng.uniform(0, 6.28))
        p = 0.5 + 0.45 * (v - (voices - 1) / 2) / max(1, (voices - 1) / 2)
        out[:, 0] += x * np.cos(p * np.pi / 2)
        out[:, 1] += x * np.sin(p * np.pi / 2)
    return out / voices * 1.6 * adsr(n, a, d, s, r, gate=dur)[:, None] * vel


def bass(m: float, dur: float, vel=1.0, bright=900, decay=0.12) -> np.ndarray:
    n = ns(dur + 0.08)
    t = secs(n)
    f0 = hz(m)
    cut = f0 * 2 + bright * np.exp(-t / decay)
    x = 0.7 * additive(f0, n, 'saw', cutoff=cut, kmax=40) + 0.75 * np.sin(2 * np.pi * f0 * t)
    x = np.tanh(1.4 * x) / np.tanh(1.4)
    return x * adsr(n, 0.003, 0.2, 0.75, 0.05, gate=dur) * vel


def bell(m: float, dur: float, vel=1.0, ratio=3.5, index=2.2, decay=0.6) -> np.ndarray:
    n = ns(dur + decay * 2.5)
    t = secs(n)
    f0 = hz(m)
    x = fm(f0, n, ratio, index, np.exp(-t / (decay * 0.35)))
    x += 0.35 * np.sin(2 * np.pi * f0 * 2 * t) * np.exp(-t / (decay * 0.5))
    return x * perc(n, decay, 0.0015) * vel


def mallet(m: float, dur: float, vel=1.0, decay=0.35) -> np.ndarray:
    """Soft marimba-ish mallet: fundamental + inharmonic overtones that die fast."""
    n = ns(min(dur, 1.2) + decay * 3)
    t = secs(n)
    f0 = hz(m)
    x = np.sin(2 * np.pi * f0 * t) * np.exp(-t / decay)
    x += 0.30 * np.sin(2 * np.pi * f0 * 3.93 * t) * np.exp(-t / (decay * 0.22))
    x += 0.10 * np.sin(2 * np.pi * f0 * 9.2 * t) * np.exp(-t / (decay * 0.08))
    return fade_edges(x * np.minimum(1, t / 0.0015) * vel, 0, 0.004)


def ep(m: float, dur: float, vel=1.0) -> np.ndarray:
    """FM electric piano for soft chords."""
    n = ns(dur + 0.4)
    t = secs(n)
    f0 = hz(m)
    x = fm(f0, n, 1.0, 1.6 * vel, np.exp(-t / 0.35))
    x += 0.18 * fm(f0, n, 14.0, 0.6, np.exp(-t / 0.03))
    return x * adsr(n, 0.002, 1.2, 0.35, 0.25, gate=dur) * vel * 0.8


def pad(m: float, dur: float, vel=1.0, cutoff=1800, seed=0):
    return supersaw(m, dur, vel, voices=4, cents=10, cutoff=cutoff, a=0.35, d=1.0, s=0.8, r=0.6, kmax=14, seed=seed)


def brass(m: float, dur: float, vel=1.0, bright=3800) -> np.ndarray:
    """Synth brass stab: filter swells open quickly then settles."""
    n = ns(dur + 0.15)
    t = secs(n)
    f0 = hz(m)
    cut = f0 + bright * (1 - np.exp(-t / 0.025)) * (0.55 + 0.45 * np.exp(-t / 0.2))
    f = vibrato(f0, n, rate=5.2, depth_cents=8, delay=0.2) if dur > 0.35 else np.full(n, f0)
    x = additive(f, n, 'saw', cutoff=cut, kmax=40) + 0.6 * additive(f * 1.004, n, 'saw', cutoff=cut, kmax=40)
    return x * 0.6 * adsr(n, 0.012, 0.25, 0.7, 0.1, gate=dur) * vel


def chip(m: float, dur: float, vel=1.0, shape='square', duty=0.5) -> np.ndarray:
    """Pure-ish 8-bit voice (softened: limited harmonics)."""
    n = ns(dur + 0.03)
    x = additive(hz(m), n, shape, kmax=18, duty=duty, cutoff=7000)
    return x * adsr(n, 0.002, 0.08, 0.6, 0.03, gate=dur) * vel


# ─── drums ───────────────────────────────────────────────────────────────────
def kick(vel=1.0, f_hi=150.0, f_lo=47.0, decay=0.32, click=0.5, seed=1) -> np.ndarray:
    n = ns(decay * 2.2)
    t = secs(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    c = filt(noise(n, seed), 'bp', (1800, 6000)) * np.exp(-t / 0.004) * click
    x = np.tanh(1.6 * (x + c)) / np.tanh(1.6)
    return fade_edges(x, 0.0002, 0.01) * vel


def clap(vel=1.0, seed=2, decay=0.12) -> np.ndarray:
    n = ns(0.45)
    t = secs(n)
    nz = filt(noise(n, seed), 'bp', (900, 5200))
    e = np.zeros(n)
    for i, off in enumerate((0, 0.011, 0.022)):
        e += (t >= off) * np.exp(-np.maximum(t - off, 0) / 0.006) * (0.7 + 0.15 * i)
    e += (t >= 0.03) * np.exp(-np.maximum(t - 0.03, 0) / decay)
    return fade_edges(nz * e * 0.55, 0, 0.01) * vel


def snare(vel=1.0, seed=3, decay=0.13, tone=190) -> np.ndarray:
    n = ns(0.35)
    t = secs(n)
    body = np.sin(2 * np.pi * np.cumsum(tone * (1 + 0.5 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.05)
    nz = filt(noise(n, seed), 'bp', (1500, 9000)) * np.exp(-t / decay)
    return fade_edges(0.6 * body + 0.7 * nz, 0.0002, 0.01) * vel


def hat(vel=1.0, open_=False, seed=4) -> np.ndarray:
    n = ns(0.4 if open_ else 0.08)
    t = secs(n)
    nz = filt(noise(n, seed), 'hp', 7000, 2)
    # metallic edge: a few detuned squares
    mt = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (3510, 4730, 5880, 7020)) * 0.06
    x = (nz + mt) * np.exp(-t / (0.11 if open_ else 0.018))
    return fade_edges(filt(x, 'hp', 6000), 0.0003, 0.005) * vel * 0.4


def shaker(vel=1.0, seed=5) -> np.ndarray:
    n = ns(0.09)
    t = secs(n)
    e = (t / 0.018) * np.exp(1 - t / 0.018)
    return fade_edges(filt(noise(n, seed), 'bp', (4500, 12000)) * e, 0, 0.005) * vel * 0.3


def crash(vel=1.0, seed=6, decay=0.9) -> np.ndarray:
    n = ns(decay * 3)
    t = secs(n)
    nz = filt(noise(n, seed), 'hp', 3500, 2)
    mt = sum(np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * f * 1.41 * t)) for f in (3200, 4570, 5310, 6890)) * 0.1
    return fade_edges((nz + mt) * np.exp(-t / decay) * np.minimum(1, t / 0.002), 0, 0.02) * vel * 0.35


def blip(m: float = 96, vel=1.0, decay=0.03) -> np.ndarray:
    """Woodblock / clock tick."""
    n = ns(decay * 6)
    t = secs(n)
    f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.51 * t) * np.exp(-t / (decay * 0.4))
    return fade_edges(x * perc(n, decay, 0.0005), 0, 0.003) * vel


def tom(m: float = 50, vel=1.0, decay=0.22) -> np.ndarray:
    n = ns(decay * 3)
    t = secs(n)
    f0 = hz(m)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.03))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    x += 0.2 * filt(noise(n, 9), 'bp', (500, 3000)) * np.exp(-t / 0.01)
    return fade_edges(x, 0.0002, 0.01) * vel


def whoosh(dur=0.5, f0=400, f1=6000, vel=1.0, seed=8, rev=False) -> np.ndarray:
    """Filtered-noise sweep (rising when f1>f0). Built from short band-passed grains."""
    n = ns(dur)
    t = secs(n)
    nz = noise(n, seed)
    out = np.zeros(n)
    steps = 24
    edges = np.linspace(0, n, steps + 1).astype(int)
    for i in range(steps):
        fc = f0 * (f1 / f0) ** ((i + 0.5) / steps)
        bw = fc * 0.6
        seg = filt(nz, 'bp', (max(40, fc - bw / 2), min(SR / 2 * 0.95, fc + bw / 2)))
        w = np.zeros(n)
        a, b = edges[i], edges[i + 1]
        L = b - a
        lo, hi = max(0, a - L // 2), min(n, b + L // 2)
        w[lo:hi] = np.hanning(hi - lo)
        out += seg * w
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    if rev:
        env = (t / dur) ** 2
    return fade_edges(out * env, 0.002, 0.01) * vel * 0.5


# ─── mixing helpers ──────────────────────────────────────────────────────────
def pan2(x: np.ndarray, p=0.0) -> np.ndarray:
    """mono → stereo, p in [-1, 1], constant power."""
    if x.ndim == 2:
        return x
    a = (p + 1) / 4 * np.pi
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)


class Bus:
    """A stereo buffer of fixed length; `periodic=True` wraps anything that rings past the end
    back onto the start, so a loop's tails continue seamlessly across the loop point."""

    def __init__(self, length_s: float | None = None, n: int | None = None, periodic=False):
        self.n = n if n is not None else ns(length_s)
        self.periodic = periodic
        self.buf = np.zeros((self.n + (0 if periodic else 0), 2))

    def add(self, x: np.ndarray, at: float, gain=1.0, pan=0.0):
        x = pan2(x, pan) * gain
        i = int(round(at * SR))
        L = len(x)
        if self.periodic:
            i %= self.n
            pos = 0
            while pos < L:
                j = (i + pos) % self.n
                take = min(L - pos, self.n - j)
                self.buf[j:j + take] += x[pos:pos + take]
                pos += take
        else:
            if i >= self.n:
                return
            take = min(L, self.n - i)
            self.buf[i:i + take] += x[:take]


def tile3(x: np.ndarray) -> np.ndarray:
    return np.concatenate([x, x, x])


def mid3(y: np.ndarray, n: int) -> np.ndarray:
    return y[n:2 * n]


def circular(fx, x: np.ndarray) -> np.ndarray:
    """Apply a (stateful) effect to a periodic signal and return one steady-state period."""
    n = len(x)
    return mid3(fx(tile3(x)), n)


# ─── effects ─────────────────────────────────────────────────────────────────
_IR_CACHE: dict = {}


def reverb_ir(seconds=1.6, predelay=0.015, seed=11, bright=0.5) -> np.ndarray:
    key = (seconds, predelay, seed, bright)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    n = ns(seconds * 1.4)
    t = secs(n)
    ir = np.zeros((n + ns(predelay), 2))
    for ch in range(2):
        nz = noise(n, seed + ch * 101)
        lo = filt(nz, 'lp', 2200)
        hi = nz - lo
        x = lo * np.exp(-t * 6.9 / seconds) + bright * hi * np.exp(-t * 6.9 / (seconds * 0.35))
        x *= np.minimum(1, t / 0.008)
        # a few early reflections
        for k, (d, g) in enumerate(((0.007, 0.5), (0.013, 0.35), (0.021, 0.3), (0.029, 0.22))):
            j = ns(d * (1 + 0.13 * ch))
            x[j] += g * (1 if (k + ch) % 2 else -1) * 6
        ir[ns(predelay):, ch] = x
    ir /= np.sqrt((ir ** 2).sum(axis=0).mean())
    _IR_CACHE[key] = ir
    return ir


def reverb(x: np.ndarray, seconds=1.6, mix=0.2, predelay=0.015, hp=250, bright=0.5) -> np.ndarray:
    x2 = pan2(x)
    ir = reverb_ir(seconds, predelay, bright=bright)
    src = filt(x2, 'hp', hp)
    wet = np.stack([signal.oaconvolve(src[:, c], ir[:, c])[:len(x2)] for c in range(2)], axis=1)
    return x2 + wet * mix


def reverb_tail(x: np.ndarray, seconds=1.6, mix=0.2, predelay=0.015, hp=250, bright=0.5) -> np.ndarray:
    """Like reverb() but returns a longer buffer so one-shots keep their tail."""
    x2 = pan2(x)
    ir = reverb_ir(seconds, predelay, bright=bright)
    pad = np.zeros((len(ir), 2))
    x2 = np.concatenate([x2, pad])
    src = filt(x2, 'hp', hp)
    wet = np.stack([signal.oaconvolve(src[:, c], ir[:, c])[:len(x2)] for c in range(2)], axis=1)
    return x2 + wet * mix


def delay(x: np.ndarray, t_s: float, fb=0.35, mix=0.25, taps=6, pingpong=True, lp=4500) -> np.ndarray:
    x2 = pan2(x)
    wet_src = filt(x2, 'lp', lp)
    out = x2.copy()
    D = ns(t_s)
    for i in range(1, taps + 1):
        g = mix * fb ** (i - 1)
        sh = np.zeros_like(x2)
        if i * D >= len(x2):
            break
        sh[i * D:] = wet_src[:-i * D]
        if pingpong:
            sh = sh[:, ::-1] if i % 2 else sh
        out += sh * g
    return out


def sidechain(n: int, hits_s, depth=0.45, release=0.16, periodic=True) -> np.ndarray:
    t = secs(n)
    g = np.ones(n)
    for h in hits_s:
        dt = (t - h) % (n / SR) if periodic else t - h
        dt = np.where(dt < 0, 1e9, dt)
        att = np.clip(dt / 0.004, 0, 1)
        g = np.minimum(g, 1 - depth * att * np.exp(-dt / release) - depth * (1 - att) * (dt < 0.004))
    return g


def limiter(x: np.ndarray, ceiling_db=-1.0, hold=0.012, smooth=0.006) -> np.ndarray:
    """Look-ahead brick-wall limiter (zero-phase: min filter + box smoothing)."""
    c = db(ceiling_db)
    pk = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    h = ns(hold)
    g = minimum_filter1d(g, size=2 * h + 1, mode='nearest')
    g = uniform_filter1d(g, size=max(1, ns(smooth)), mode='nearest')
    y = x * (g[:, None] if x.ndim == 2 else g)
    return np.clip(y, -c, c)


def true_peak_db(x: np.ndarray) -> float:
    y = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(max(np.abs(y).max(), 1e-9))


def lufs(x: np.ndarray) -> float:
    import pyloudnorm as pyln
    m = pyln.Meter(SR)
    if len(x) < ns(0.45):
        x = np.concatenate([x, np.zeros((ns(0.45) - len(x),) + x.shape[1:])])
    return m.integrated_loudness(x)


def max_momentary(x: np.ndarray) -> float:
    """Max K-weighted loudness over 400 ms windows (LUFS-ish), for short one-shots."""
    import pyloudnorm as pyln
    m = pyln.Meter(SR, block_size=0.4)
    x2 = pan2(x) if x.ndim == 1 else x
    pad = np.zeros((ns(0.4), 2))
    x2 = np.concatenate([pad, x2, pad])
    best = -120.0
    hop = ns(0.05)
    w = ns(0.4)
    # apply K-weighting via meter's filters by measuring windows directly
    for i in range(0, len(x2) - w, hop):
        seg = x2[i:i + w]
        if np.abs(seg).max() < 1e-6:
            continue
        try:
            v = m.integrated_loudness(seg)
        except Exception:
            continue
        best = max(best, v)
    return best
