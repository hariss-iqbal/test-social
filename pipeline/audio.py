"""Stage: mix. build/voice.wav + music + sfx -> build/mix.wav, then mux with the
silent render into out/<ver>/final.mp4 at -14 LUFS / -1 dBTP.

Audio is mixed in numpy (sample-exact ducking and SFX placement) instead of
inside the video renderer, so the mix can be redone without re-rendering video."""
import json
import re

import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

from . import config as C
from .util import ROOT, StageError, load_json, log, run

SR = 48000


def _read(path):
    r, d = wavfile.read(path)
    if r != SR:
        raise StageError(f"{path}: sample rate {r} != {SR}")
    d = d.astype(np.float32)
    if d.dtype != np.float32 or np.abs(d).max() > 2:
        d = d / 32768.0
    return d


def _decode(src, out, extra_af="", start=0.0, dur=None, loop=False, channels=2):
    cmd = ["ffmpeg", "-y", "-v", "error"]
    if loop:
        cmd += ["-stream_loop", "-1"]
    cmd += ["-ss", f"{start:.3f}", "-i", str(src)]
    if dur:
        cmd += ["-t", f"{dur:.3f}"]
    af = "aresample=48000" + ("," + extra_af if extra_af else "")
    cmd += ["-af", af, "-ac", str(channels), "-ar", str(SR), "-c:a", "pcm_f32le", str(out)]
    run(cmd)
    return _read(out)


# ---------- SFX synthesis (license-free, deterministic) ----------

def _env(n, attack, release):
    e = np.ones(n, np.float32)
    a, r = int(attack * SR), int(release * SR)
    if a:
        e[:a] = np.linspace(0, 1, a) ** 2
    if r:
        e[-r:] *= np.linspace(1, 0, r) ** 2
    return e


def _sweep_filter(x, f_lo, f_hi, curve):
    """Crude time-varying band-pass: crossfade between filtered copies."""
    bands = np.geomspace(f_lo, f_hi, 8)
    outs = [sosfilt(butter(2, [b * 0.7, min(b * 1.4, SR / 2 - 100)], "bandpass", fs=SR, output="sos"), x) for b in bands]
    pos = curve * (len(bands) - 1)
    y = np.zeros_like(x)
    for i, o in enumerate(outs):
        wgt = np.clip(1 - np.abs(pos - i), 0, 1)
        y += o * wgt
    return y


def synth(kind, rng):
    t = lambda d: np.arange(int(d * SR)) / SR  # noqa: E731
    if kind == "whoosh":
        d = 0.55
        x = rng.standard_normal(int(d * SR)).astype(np.float32)
        tt = t(d) / d
        curve = np.sin(np.pi * tt) ** 1.5
        y = _sweep_filter(x, 250, 5000, curve) * np.sin(np.pi * tt) ** 2
    elif kind == "impact":
        d = 1.6
        tt = t(d)
        f = 38 + 60 * np.exp(-tt * 18)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
        thud = np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 14) * 0.6
        n = rng.standard_normal(len(tt)).astype(np.float32)
        crack = sosfilt(butter(2, [800, 6000], "bandpass", fs=SR, output="sos"), n) * np.exp(-tt * 40) * 0.8
        tail = sosfilt(butter(2, 400, "lowpass", fs=SR, output="sos"), n) * np.exp(-tt * 2.5) * 0.25
        y = body + thud + crack + tail
    elif kind == "riser":
        d = 1.8
        tt = t(d) / d
        f = 180 + 1400 * tt ** 2
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
        n = rng.standard_normal(len(tt)).astype(np.float32)
        y = (tone + _sweep_filter(n, 300, 7000, tt) * 1.2) * tt ** 2.2
        y[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    elif kind == "tick":
        d = 0.09
        tt = t(d)
        y = (np.sin(2 * np.pi * 2400 * tt) + 0.5 * np.sin(2 * np.pi * 5200 * tt)) * np.exp(-tt * 90)
    elif kind == "sub_drop":
        d = 1.3
        tt = t(d)
        f = 32 + 90 * np.exp(-tt * 3)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2)
        y += 0.35 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * np.exp(-tt * 3)
    elif kind == "shutter":
        d = 0.18
        n = rng.standard_normal(int(d * SR)).astype(np.float32)
        tt = t(d)
        y = sosfilt(butter(2, [1500, 9000], "bandpass", fs=SR, output="sos"), n)
        y *= np.exp(-tt * 60) + 0.7 * np.exp(-np.maximum(0, tt - 0.07) * 80) * (tt > 0.07)
    else:
        raise StageError(f"unknown sfx {kind}")
    y = y.astype(np.float32)
    return y / (np.abs(y).max() + 1e-9) * 0.7


# ---------- helpers ----------

def _smooth(env, seconds):
    k = max(1, int(seconds * SR / 64))
    small = env[::64]
    ker = np.ones(k) / k
    sm = np.convolve(np.pad(small, (k, k), mode="edge"), ker, mode="same")[k:-k]
    return np.interp(np.arange(len(env)), np.arange(len(sm)) * 64, sm).astype(np.float32)


def _loudnorm_measure(path, af_prefix=""):
    r = run(["ffmpeg", "-hide_banner", "-i", str(path), "-af",
             f"{af_prefix}loudnorm=I={C.TARGET_LUFS}:TP={C.TARGET_TP}:LRA=9:print_format=json", "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        raise StageError("loudnorm measurement failed")
    return json.loads(m.group(0))


def stage_mix(topic, render_path, out_path):
    b = topic / "build"
    tl = load_json(b / "timeline.json")
    al = load_json(b / "alignment.json")
    total = tl["durationInFrames"] / tl["fps"]
    n = int(total * SR)

    voice = _decode(b / "voice.wav", b / "voice_proc.wav",
                    "highpass=f=85,acompressor=threshold=-21dB:ratio=3:attack=5:release=90:makeup=2,"
                    "equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=220:t=q:w=1:g=-1.5,loudnorm=I=-16:TP=-2",
                    channels=1)
    vo = np.zeros(n, np.float32)
    vo[:min(n, len(voice))] = voice[:n]
    mix = np.stack([vo, vo], axis=1)

    music = (tl.get("audio") or {}).get("music") or {}
    if music.get("src"):
        src = ROOT / music["src"]
        if not src.exists():
            src = topic / music["src"]
        mus = _decode(src, b / "music.wav", "loudnorm=I=-16:TP=-2", start=music.get("offset_s", 0.0),
                      dur=total, loop=True)
        mus = mus[:n] if len(mus) >= n else np.pad(mus, ((0, n - len(mus)), (0, 0)))
        env = np.full(n, C.MUSIC_OPEN, np.float32)
        for w in al["words"]:  # duck under speech (pad so tiny gaps stay ducked)
            s0, s1 = int(max(0, w["start"] - 0.3) * SR), int((w["end"] + 0.6) * SR)
            env[s0:s1] = C.MUSIC_UNDER_VOICE
        for cue in tl["audio"].get("music_cues", []):
            s0, s1 = int(cue["start"] * SR), int(cue["end"] * SR)
            if cue["cue"] == "drop":
                env[s0:s1] *= C.MUSIC_DROP_FACTOR  # a dip, never silence (owner feedback on v12)
            elif cue["cue"] == "swell":
                env[s0:s1] *= 1.8
        env = _smooth(env, C.MUSIC_SMOOTH_S)
        env = np.maximum(env, C.MUSIC_FLOOR)
        fade_in, fade_out = int(0.4 * SR), int(1.5 * SR)
        env[:fade_in] *= np.linspace(0, 1, fade_in)
        env[-fade_out:] *= np.linspace(1, 0, fade_out)
        env *= 10 ** (music.get("gain_db", 0.0) / 20)
        mix += mus * env[:, None]

    rng = np.random.default_rng(7)
    for x in tl["audio"].get("sfx", []):
        if x["type"].startswith("lib:"):
            from .sfxlib import library
            ent = library()[x["type"][4:]]
            clip = _decode(ROOT / ent["file"], b / f"sfx_{x['type'][4:]}.wav", "loudnorm=I=-18:TP=-3", channels=1)
            clip = clip * x.get("gain", 0.7)
        else:
            clip = synth(x["type"], rng) * x.get("gain", 0.7)
        start = x["t"] - (len(clip) / SR if x["type"] == "riser" else 0.0)
        s0 = int(max(0, start) * SR)
        seg = clip[: max(0, min(len(clip), n - s0))].copy()
        # effects never compete with words: duck them to SFX_UNDER_VOICE wherever narration is speaking
        speech = np.zeros(len(seg), np.float32)
        for w in al["words"]:
            a0, a1 = int(w["start"] * SR) - s0, int((w["end"] + 0.05) * SR) - s0
            if a1 > 0 and a0 < len(seg):
                speech[max(0, a0):min(len(seg), a1)] = 1.0
        if speech.any():
            k = int(0.05 * SR)
            speech = np.convolve(speech, np.ones(k) / k, mode="same")
            seg = seg * (1 - speech * (1 - C.SFX_UNDER_VOICE))
        mix[s0:s0 + len(seg)] += seg[:, None]

    raw = b / "mix_raw.wav"
    wavfile.write(raw, SR, mix.astype(np.float32))
    meas = _loudnorm_measure(raw)
    ln = (f"loudnorm=I={C.TARGET_LUFS}:TP={C.TARGET_TP}:LRA=9:measured_I={meas['input_i']}:"
          f"measured_TP={meas['input_tp']}:measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:"
          f"offset={meas['target_offset']}:linear=true")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(render_path), "-i", str(raw), "-map", "0:v", "-map", "1:a",
         "-af", ln + ",aresample=48000", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", "-shortest", str(out_path)])
    log("mix", f"mixed voice + {'music' if music.get('src') else 'no music'} + {len(tl['audio'].get('sfx', []))} sfx -> {out_path}")
    return out_path
