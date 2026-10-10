"""Sound design generated from build/events.json (written by timeline.py from world.json).

Beds (continuous, crossfaded on change; a "cut" event switches instantly):
  park     calm daytime: soft A-minor pad + distant city rumble + birds
  drone    after the event: sub drone that slowly swells, no music
  space    airy high pad over a low hum
  endcard  quiet tail to near-silence (loop card)
Events: impact, whoosh, riser(dur_s), ping, cut, sub_drop, tick.
Everything is synthesized (license-free, deterministic) and loudness-normalized to -14 LUFS / -1 dBTP."""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample, sosfilt

from .. import config as C
from ..audio import SR, _loudnorm_measure, synth
from ..util import load_json, log, run

BED_GAIN = {"park": 0.22, "drone": 0.3, "space": 0.22, "endcard": 0.08, "none": 0.0,
            "theme": 0.2, "sun": 0.42, "light": 0.24, "aurora": 0.22, "frozen": 0.24, "void": 0.14, "quake": 0.32}
EVENT_GAIN = {"crumble": 0.9, "skid": 0.35, "zap": 0.45, "boom": 1.6, "suck": 0.6, "impact": 0.95, "whoosh": 0.35, "riser": 0.45, "ping": 0.4, "sub_drop": 0.8, "tick": 0.3}


def _lp(x, f):
    return sosfilt(butter(2, f, "lowpass", fs=SR, output="sos"), x)


def _bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def _pad(n, freqs, rng, lfo=0.07, bright=0.3):
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, f in enumerate(freqs):
        ph = rng.random() * 6.28
        det = 1 + (rng.random() - 0.5) * 0.004
        amp = 1 / (1 + i * 0.4)
        y += amp * (np.sin(2 * np.pi * f * det * t + ph) + bright * np.sin(2 * np.pi * 2 * f * t + ph * 1.3))
    y *= 0.75 + 0.25 * np.sin(2 * np.pi * lfo * t + rng.random() * 6.28)
    return y / (np.abs(y).max() + 1e-9)


def bed(kind, n, rng):
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    if kind == "park":
        pad = _pad(n, [110, 164.81, 220, 261.63, 329.63], rng, lfo=0.05, bright=0.15) * 0.55
        rumble = _lp(noise, 180) * 2.5
        air = _bp(noise, 2000, 7000) * 0.05
        birds = np.zeros(n)
        for _ in range(int(n / SR * 1.4)):
            s = rng.integers(0, max(1, n - SR // 2))
            d = int(SR * (0.06 + rng.random() * 0.12))
            tt = np.arange(d) / SR
            f0 = 2500 + rng.random() * 2500
            chirp = np.sin(2 * np.pi * np.cumsum(f0 + 1800 * np.sin(tt * 60)) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2
            birds[s:s + d] += chirp * (0.08 + rng.random() * 0.12)
        y = pad + rumble * 0.4 + air + birds
    elif kind == "drone":
        swell = np.clip(t / max(t[-1], 1e-6), 0, 1) ** 0.7
        sub = np.sin(2 * np.pi * 41.2 * t) + 0.6 * np.sin(2 * np.pi * 55 * t + 1) + 0.35 * np.sin(2 * np.pi * 82.4 * t)
        sub *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * t)
        grit = _lp(noise, 120) * 3
        high = _bp(noise, 3000, 9000) * 0.02 * swell
        y = (sub * 0.7 + grit * 0.25) * (0.6 + 0.4 * swell) + high
    elif kind == "space":
        pad = _pad(n, [220, 329.63, 440, 659.25, 880], rng, lfo=0.09, bright=0.05) * 0.5
        hum = np.sin(2 * np.pi * 55 * t) * 0.35
        y = pad + hum + _bp(noise, 4000, 10000) * 0.015
    elif kind == "theme":
        # slow Am - F - C - G progression, soft bell plucks on top (the channel's warm "before" music)
        chords = [[110, 164.81, 220, 261.63], [87.31, 130.81, 174.61, 220], [130.81, 196, 261.63, 329.63], [98, 146.83, 196, 246.94]]
        bar = int(SR * 4.0)
        y = np.zeros(n)
        for k in range(0, n, bar):
            ch = chords[(k // bar) % 4]
            m = min(bar + SR, n - k)
            seg = _pad(m, ch, rng, lfo=0.1, bright=0.12)
            env = np.minimum(1, np.arange(m) / (SR * 0.9)) * np.minimum(1, (m - np.arange(m)) / (SR * 1.0))
            y[k:k + m] += seg * env * 0.6
            for j in range(3):
                s0 = k + int(SR * (0.2 + j * 1.3 + rng.random() * 0.3))
                if s0 >= n:
                    break
                f = ch[rng.integers(1, 4)] * 2
                d = min(int(SR * 2.4), n - s0)
                tt = np.arange(d) / SR
                y[s0:s0 + d] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 1.8) * 0.28
    elif kind == "sun":
        # HOT FIRE: a roaring blaze - flame flutter on a low-mid roar, dense crackle, deep rumble, flare whooshes
        flutter = 0.65 + 0.35 * np.abs(np.sin(2 * np.pi * 7.3 * t + np.sin(2 * np.pi * 0.9 * t) * 2.0))
        roar = (_bp(noise, 60, 260) * 2.6 + _bp(noise, 260, 1100) * 1.1) * flutter
        roar *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.37 * t) * np.sin(2 * np.pi * 0.11 * t + 1.3)
        rumble = _lp(noise, 55) * 6 + np.sin(2 * np.pi * 32.7 * t) * 0.35
        # crackle: thousands of tiny pops (fire), each a few ms of band-passed noise with random pitch
        crackle = np.zeros(n)
        for _ in range(int(n / SR * 90)):
            s0 = rng.integers(0, max(1, n - 400))
            d = int(SR * (0.0015 + rng.random() * 0.006))
            pop = rng.standard_normal(d) * np.exp(-np.arange(d) / (d * 0.25)) * (0.3 + rng.random() * 1.2)
            crackle[s0:s0 + d] += pop
        crackle = _bp(crackle, 1200, 9000) * 1.6
        # flare whooshes every few seconds
        flares = np.zeros(n)
        k = int(SR * 0.6)
        while k < n - SR:
            d = int(SR * (0.9 + rng.random() * 0.9))
            d = min(d, n - k)
            tt = np.arange(d) / d
            flares[k:k + d] += _bp(rng.standard_normal(d), 300, 2400) * np.sin(np.pi * tt) ** 2 * 1.4
            k += int(SR * (1.6 + rng.random() * 2.2))
        y = roar + rumble * 0.55 + crackle + flares
    elif kind == "light":
        # riding the last light: bright shimmering cluster that slowly rises
        rise = 1 + 0.06 * t / max(t[-1], 1e-6)
        y = sum(np.sin(2 * np.pi * f * rise * t + i) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.3 + i * 0.07) * t)) for i, f in enumerate([440, 554.37, 659.25, 880, 1108.7]))
        y = y / 5 + _bp(noise, 5000, 11000) * 0.03 + np.sin(2 * np.pi * 55 * t) * 0.25
    elif kind == "aurora":
        y = _pad(n, [196, 293.66, 392, 587.33, 783.99], rng, lfo=0.06, bright=0.02) * 0.6 + _bp(noise, 300, 1200) * 0.04
    elif kind == "frozen":
        gust = 0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * t + rng.random() * 6) * np.sin(2 * np.pi * 0.031 * t)
        wind = _bp(noise, 250, 900) * 0.9 * gust + _bp(noise, 900, 2500) * 0.3 * gust
        y = wind + np.sin(2 * np.pi * 41.2 * t) * 0.25
    elif kind == "quake":
        y = _lp(noise, 70) * 6 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t)) + _bp(noise, 150, 600) * 0.4
    elif kind == "void":
        y = np.sin(2 * np.pi * 32.7 * t) * 0.6 + _pad(n, [130.81, 196], rng, lfo=0.04, bright=0.0) * 0.25
    elif kind == "endcard":
        y = np.sin(2 * np.pi * 41.2 * t) * np.exp(-t * 0.9) + _pad(n, [220, 329.63], rng) * 0.2 * np.exp(-t * 1.2)
    else:
        y = np.zeros(n)
    # beds sit low so hits and silences carry the drama (loudness is normalised afterwards)
    return (y / (np.abs(y).max() + 1e-9)).astype(np.float32) * BED_GAIN.get(kind, 0.2) * 0.65


def ping(rng):
    d = 2.2
    t = np.arange(int(d * SR)) / SR
    y = (np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t) + 0.25 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 2.6)
    y[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return (y / np.abs(y).max() * 0.7).astype(np.float32)


def suck(dur, rng):
    """Reverse swell that ENDS on its event time (the inhale before something vanishes)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = _lp(rng.standard_normal(n), 2500) * 0.6 + np.sin(2 * np.pi * (60 + 300 * (t / dur) ** 3) * t) * 0.4
    y *= (t / dur) ** 3
    return (y / (np.abs(y).max() + 1e-9) * 0.8).astype(np.float32)


def fx(kind, rng):
    """Extra disaster SFX (synthesized)."""
    def tt(d):
        return np.arange(int(d * SR)) / SR
    if kind == "crumble":
        t = tt(3.0)
        n = rng.standard_normal(len(t))
        rumble = _lp(n, 120) * 5 * np.exp(-t * 0.8)
        debris = np.zeros(len(t))
        for _ in range(140):
            s0 = rng.integers(0, len(t) - 3000)
            d = int(SR * (0.01 + rng.random() * 0.05))
            debris[s0:s0 + d] += _bp(rng.standard_normal(d), 400, 4000) * np.exp(-np.arange(d) / (d * 0.3)) * (0.3 + rng.random())
        y = rumble + debris * np.exp(-t * 0.6) * 1.5
    elif kind == "skid":
        t = tt(1.4)
        f = 900 + 250 * np.sin(2 * np.pi * 3 * t) - 300 * t
        y = (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + _bp(rng.standard_normal(len(t)), 1500, 5000) * 0.8) * np.sin(np.pi * t / t[-1]) ** 0.5
    elif kind == "zap":
        t = tt(0.45)
        buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.4 + _bp(rng.standard_normal(len(t)), 2000, 9000)
        y = buzz * np.exp(-t * 7) * (rng.random(len(t)) < 0.6)
    elif kind == "boom":
        t = tt(4.0)
        f = 30 + 70 * np.exp(-t * 6)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1) * 1.2 + _lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 0.9) * 2
        y[: int(0.03 * SR)] += _bp(rng.standard_normal(int(0.03 * SR)), 1000, 8000) * 3
    else:
        raise KeyError(kind)
    y = y.astype(np.float32)
    return y / (np.abs(y).max() + 1e-9) * 0.75


def event_sound(e, rng):
    k = e["kind"]
    if k in ("crumble", "skid", "zap", "boom"):
        return fx(k, rng)
    if k == "ping":
        return ping(rng)
    if k == "suck":
        return suck(float(e.get("dur_s", 1.5)), rng)
    y = synth(k, rng)
    if k == "riser" and e.get("dur_s"):
        y = resample(y, int(float(e["dur_s"]) * SR)).astype(np.float32)
    if k == "impact":  # add a long sub tail for the big moment
        y = np.concatenate([y, np.zeros(SR * 2, np.float32)])
        y[: len(synth("sub_drop", rng))] += synth("sub_drop", rng) * 0.9
    return y


def stage_sound(topic, out_wav):
    b = topic / "build"
    ev = load_json(b / "events.json")
    total = float(ev["duration"])
    n = int(total * SR) + SR
    rng = np.random.default_rng(1234)
    mix = np.zeros((n, 2), np.float32)

    # beds: segments between bed changes, 0.6 s crossfades (instant on "cut")
    changes = [e for e in ev["events"] if e["kind"] == "bed"]
    cuts = {round(e["t"], 3) for e in ev["events"] if e["kind"] == "cut"}
    segs, cur = [], None
    for e in changes:
        name = cur if e["bed"] == "keep" else e["bed"]
        if name != cur:
            segs.append([e["t"], name])
            cur = name
    for i, (t0, name) in enumerate(segs):
        t1 = segs[i + 1][0] if i + 1 < len(segs) else total + 1
        fade_in = 0.01 if round(t0, 3) in cuts else 0.6
        fade_out = 0.01 if i + 1 < len(segs) and round(t1, 3) in cuts else 0.6
        a, z = int(t0 * SR), min(n, int((t1 + fade_out) * SR))
        seg = bed(name, z - a, rng)
        env = np.ones(z - a, np.float32)
        fi, fo = int(fade_in * SR), int(fade_out * SR)
        env[:fi] = np.linspace(0, 1, fi) if fi else env[:fi]
        if fo and i + 1 < len(segs):
            env[-fo:] *= np.linspace(1, 0, fo)
        seg *= env
        delay = int(0.011 * SR)  # cheap stereo width
        mix[a:z, 0] += seg
        mix[a + delay:z, 1] += seg[: z - a - delay]

    # deliberate silences: "mute" events duck the beds to zero for dur_s (hits still play on top)
    for e in ev["events"]:
        if e["kind"] == "mute":
            a, d = int(e["t"] * SR), int(float(e.get("dur_s", 1.0)) * SR)
            z = min(n, a + d)
            env = np.zeros(z - a, np.float32)
            rel = min(int(0.25 * SR), z - a)
            if rel:
                env[-rel:] = np.linspace(0, 1, rel)
            mix[a:z] *= env[:, None]
    for e in ev["events"]:
        if e["kind"] in ("bed", "cut", "mute"):
            continue
        y = event_sound(e, rng) * EVENT_GAIN.get(e["kind"], 0.4) * float(e.get("gain", 1))
        a = int(e["t"] * SR) - (len(y) if e["kind"] == "suck" else 0)
        if a < 0:
            y, a = y[-a:], 0
        z = min(n, a + len(y))
        mix[a:z, 0] += y[: z - a]
        mix[a:z, 1] += y[: z - a]

    mix = mix[: int(total * SR)]
    mix /= max(1.0, np.abs(mix).max() / 0.9)
    raw = b / "sound_raw.wav"
    wavfile.write(raw, SR, mix)
    # one static gain to -14 LUFS + a true-peak limiter. (ffmpeg's loudnorm silently falls back to
    # dynamic compression when linear mode can't meet the peak target, which flattened every silence/hit.)
    m = _loudnorm_measure(raw)
    gain = C.TARGET_LUFS - float(m["input_i"])
    # limit 1.5 dB under the target ceiling, then a fixed trim: keeps sample/true peaks below -1 dBTP
    lim = f"alimiter=limit={10 ** ((C.TARGET_TP - 1.5) / 20):.3f}:attack=1:release=60:level=disabled"
    for _ in range(3):  # the limiter shaves level off peaks; re-aim until within 0.3 LU
        run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", f"volume={gain:.2f}dB,{lim}", "-ar", str(SR), str(out_wav)])
        got = float(_loudnorm_measure(out_wav)["input_i"])
        if abs(got - C.TARGET_LUFS) < 0.3:
            break
        gain += C.TARGET_LUFS - got
    log("sound", f"{len(segs)} bed segments, {sum(1 for e in ev['events'] if e['kind'] not in ('bed', 'cut'))} events -> {out_wav.name}")
    return out_wav
