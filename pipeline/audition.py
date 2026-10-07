"""Voice casting: render the hook + one tension line in several narrator voices,
score each objectively, save samples for a human to listen to.

  python3 -m pipeline.run audition <topic>

Score = clarity (Whisper word error rate against the script) + pitch (lower
median F0 reads as more ominous for mystery/true-crime) + pace near the target.
The winner is written to script.json voice settings only if none is set yet."""
import asyncio

import numpy as np
from scipy.io import wavfile

from .util import load_json, log, norm_word, run, save_json

# Narrator candidates for mystery / true crime. rate/pitch tuned toward a measured, low delivery.
CANDIDATES = [
    {"edge_voice": "en-US-AndrewMultilingualNeural", "edge_rate": "+4%", "edge_pitch": "-4Hz"},
    {"edge_voice": "en-US-ChristopherNeural", "edge_rate": "+6%", "edge_pitch": "-2Hz"},
    {"edge_voice": "en-US-BrianMultilingualNeural", "edge_rate": "+4%", "edge_pitch": "-4Hz"},
    {"edge_voice": "en-US-GuyNeural", "edge_rate": "+4%", "edge_pitch": "-6Hz"},
    {"edge_voice": "en-GB-RyanNeural", "edge_rate": "+6%", "edge_pitch": "-2Hz"},
    {"edge_voice": "en-US-AvaMultilingualNeural", "edge_rate": "+4%", "edge_pitch": "-2Hz"},
]
TARGET_WPS = 2.75

# ElevenLabs premade voices usable on any plan (library voices need a paid plan via API).
ELEVEN = [
    ("George", "JBFqnCBsd6RMkjVDRZzb", "eleven_multilingual_v2"),
    ("George", "JBFqnCBsd6RMkjVDRZzb", "eleven_v3"),
    ("Brian", "nPczCjzI2devNBz1zQrb", "eleven_v3"),
    ("Daniel", "onwK4e9ZLuTAKqWW03F9", "eleven_v3"),
    ("Callum", "N2lVS1w4EtoT3dr4eOWO", "eleven_v3"),
    ("Bill", "pqHfZKP75CvOlQylNhV4", "eleven_v3"),
    ("Roger", "CwhRBWXzGAHq8TQ4Fs17", "eleven_v3"),
    ("Lily", "pFZP5JQG7iQjIQuC4Bku", "eleven_v3"),
]
SAMPLE = ("For nineteen days, guests at the Cecil Hotel drank water from the tank on the roof. "
          "Then a maintenance worker climbed up, lifted the lid, and looked inside.")


def _tts(text, c, path):
    import edge_tts

    async def go():
        comm = edge_tts.Communicate(text, c["edge_voice"], rate=c["edge_rate"], pitch=c["edge_pitch"])
        await comm.save(str(path))
    asyncio.run(go())


def _median_f0(wav):
    sr, x = wavfile.read(wav)
    x = x.astype(np.float32)
    if x.ndim > 1:
        x = x.mean(axis=1)
    f0s = []
    win = int(0.04 * sr)
    for i in range(0, len(x) - win, win):
        seg = x[i:i + win]
        if np.sqrt((seg ** 2).mean()) < 300:
            continue
        ac = np.correlate(seg, seg, "full")[win - 1:]
        lo, hi = int(sr / 300), int(sr / 70)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.3 * ac[0]:
            f0s.append(sr / k)
    return float(np.median(f0s)) if f0s else 0.0


def audition(topic, engine="auto"):
    import os
    from faster_whisper import WhisperModel
    from .voice import _elevenlabs_key_ok, _tts_elevenlabs
    from .util import load_env

    load_env()
    script_p = topic / "script.json"
    script = load_json(script_p) if script_p.exists() else None
    text = SAMPLE
    use_eleven = engine == "elevenlabs" or (engine == "auto" and _elevenlabs_key_ok(os.environ.get("ELEVENLABS_API_KEY", "")))
    ref = [norm_word(w) for w in text.split() if norm_word(w)]
    out = topic / "build" / "voice_audition"
    out.mkdir(parents=True, exist_ok=True)
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    rows = []
    cands = ([{"engine": "elevenlabs", "elevenlabs_voice_id": v, "elevenlabs_model": m, "_name": f"{n}_{m.replace('eleven_', '')}"}
              for n, v, m in ELEVEN] if use_eleven else CANDIDATES)
    for c in cands:
        name = c.get("_name") or c["edge_voice"].split("-")[2].replace("Neural", "")
        mp3, wav = out / f"{name}.mp3", out / f"{name}.wav"
        try:
            if mp3.exists():
                pass
            elif c.get("engine") == "elevenlabs":
                _tts_elevenlabs(text, c, mp3)
            else:
                _tts(text, c, mp3)
        except Exception as ex:  # noqa: BLE001
            log("audition", f"{name}: failed ({ex})")
            continue
        run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "16000", str(wav)])
        segs, _ = model.transcribe(str(wav), beam_size=5)
        hyp = [norm_word(w) for s in segs for w in s.text.split() if norm_word(w)]
        # word error rate via edit distance
        d = np.arange(len(hyp) + 1)
        for i, r in enumerate(ref, 1):
            prev, d[0] = d.copy(), i
            for j, h in enumerate(hyp, 1):
                d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (r != h))
        wer = d[len(hyp)] / max(1, len(ref))
        sr, x = wavfile.read(wav)
        dur = len(x) / sr
        wps = len(ref) / dur
        f0 = _median_f0(wav)
        female = f0 > 165
        score = (1 - min(wer, 0.3) / 0.3) * 50 + max(0, 30 - abs(f0 - 95) * 0.4) + max(0, 20 - abs(wps - TARGET_WPS) * 25)
        rows.append({**{k: v for k, v in c.items() if not k.startswith("_")}, "name": name, "wer": round(wer, 3), "median_f0": round(f0), "wps": round(wps, 2),
                     "score": round(score, 1), "sample": str(mp3.relative_to(topic)), "female": female})
        log("audition", f"{name:24s} WER {wer:.1%}  F0 {f0:5.0f}Hz  {wps:.2f} w/s  score {score:.1f}")
    rows.sort(key=lambda r: -r["score"])
    save_json(out / "results.json", rows)
    if rows and script is not None and not script.get("voice"):
        best = rows[0]
        script["voice"] = {k: best[k] for k in ("engine", "edge_voice", "edge_rate", "edge_pitch",
                                                "elevenlabs_voice_id", "elevenlabs_model") if k in best}
        save_json(script_p, script)
        log("audition", f"cast {best['name']} -> script.json voice")
    return rows
