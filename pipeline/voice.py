"""Stage: voice. script.json -> build/voice.wav + build/alignment.json

Each beat is synthesized separately (cached by text+voice hash), trimmed to its
spoken words, then joined with the beat's pause_after_ms. Word timings come from
the TTS engine itself (ElevenLabs /with-timestamps or edge-tts WordBoundary), so
captions and cuts match the audio exactly - no Whisper, no misspelled names."""
import asyncio
import base64
import hashlib
import json
import os
import re
import urllib.request

from . import config as C
from .util import StageError, audio_duration, load_env, load_json, log, run, save_json, strip_markup, warn

SR = 48000


def _emphasis_ranges(text):
    """Return stripped text and char ranges (in stripped text) that were *emphasized*."""
    out, ranges, i, start = [], [], 0, None
    for ch in text:
        if ch == "*":
            if start is None:
                start = i
            else:
                ranges.append((start, i))
                start = None
            continue
        out.append(ch)
        i += 1
    return "".join(out), ranges


def _elevenlabs_key_ok(key):
    return bool(key) and key.startswith("sk_")


def _tts_elevenlabs(text, voice, path, raw_chars=False):
    key = os.environ["ELEVENLABS_API_KEY"]
    body = json.dumps({
        "text": text,
        "model_id": voice["elevenlabs_model"],
        "voice_settings": ({"stability": float(voice.get("v3_stability", 0.5))}
                           if voice["elevenlabs_model"].startswith("eleven_v3")
                           else {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35}),
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice['elevenlabs_voice_id']}/with-timestamps",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    if "audio_base64" not in d:
        raise StageError(f"ElevenLabs returned no audio: {str(d)[:200]}")
    with open(path, "wb") as f:
        f.write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]
    if raw_chars:
        return {"chars": al["characters"], "starts": al["character_start_times_seconds"],
                "ends": al["character_end_times_seconds"]}
    words, cur, cs, ce = [], "", None, None
    for ch, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append({"text": cur, "start": cs, "end": ce})
            cur, cs = "", None
            continue
        if cs is None:
            cs = s
        cur += ch
        ce = e
    if cur:
        words.append({"text": cur, "start": cs, "end": ce})
    # v3 audio tags like "[whispers]" are not spoken words
    return [w for w in words if not (w["text"].startswith("[") and w["text"].endswith("]"))]


def _tts_edge(text, voice, path):
    import edge_tts

    async def go():
        c = edge_tts.Communicate(text, voice["edge_voice"], rate=voice["edge_rate"], pitch=voice.get("edge_pitch", "+0Hz"), boundary="WordBoundary")
        ws = []
        with open(path, "wb") as f:
            async for ch in c.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    s = ch["offset"] / 1e7
                    ws.append({"text": ch["text"], "start": s, "end": s + ch["duration"] / 1e7})
        return ws

    for attempt in range(3):
        try:
            return asyncio.run(go())
        except Exception as ex:  # noqa: BLE001 - network hiccups
            if attempt == 2:
                raise StageError(f"edge-tts failed: {ex}")
    return []


def _attach_source_tokens(words, text, emph):
    """Map engine words onto the source text to recover punctuation + emphasis."""
    lower = text.lower()
    cur = 0
    for w in words:
        key = re.sub(r"[^\w']", "", w["text"].lower())
        idx = lower.find(w["text"].lower(), cur)
        if idx < 0 and key:
            idx = lower.find(key, cur)
        if idx < 0:
            w["display"], w["punct"], w["emph"] = w["text"], "", False
            continue
        end = idx + len(w["text"]) if lower.startswith(w["text"].lower(), idx) else idx + len(key)
        # extend over trailing punctuation up to next space
        j = end
        while j < len(text) and not text[j].isspace():
            j += 1
        w["display"] = text[idx:j]
        # trailing punctuation of the displayed token (engines differ on whether it's in w["text"])
        m = re.search(r"[^\w']+$", w["display"])
        w["punct"] = m.group(0) if m else ""
        w["emph"] = any(a <= idx < b for a, b in emph)
        cur = j
    return words


def _single_take(script, voice, engine, vdir, force):
    """ElevenLabs: synthesize the WHOLE script in one request so tone, pace and level stay
    consistent across beats (per-beat requests drift). Returns per-beat (raw, words, head, tail, hash)
    or None to fall back to per-beat synthesis."""
    if engine != "elevenlabs" or not voice.get("single_take", True):
        return None
    v3 = voice["elevenlabs_model"].startswith("eleven_v3")
    full, ranges = "", []
    for i, b in enumerate(script["beats"]):
        body, _ = _emphasis_ranges(b["narration"].strip())
        if v3 and b.get("v3_tag"):
            full += f"[{b['v3_tag']}] "
        ranges.append((len(full), len(full) + len(body)))
        full += body + ("\n\n" if i < len(script["beats"]) - 1 else "")
    h = hashlib.sha1(json.dumps([full, {k: v for k, v in voice.items() if k != "tempo"}], sort_keys=True).encode()).hexdigest()[:10]
    raw, meta = vdir / f"take_{h}.mp3", vdir / f"take_{h}.json"
    if force or not (raw.exists() and meta.exists()):
        log("voice", f"TTS single take ({len(full)} chars, {len(script['beats'])} beats)")
        save_json(meta, _tts_elevenlabs(full, voice, raw, raw_chars=True))
    al = load_json(meta)
    if "".join(al["chars"]) != full:
        warn("voice", "alignment text differs from request - falling back to per-beat synthesis")
        return None
    per = []
    for a, z in ranges:
        ws, cur, cs, ce = [], "", None, None
        for k in range(a, z):
            ch = al["chars"][k]
            if ch.isspace():
                if cur:
                    ws.append({"text": cur, "start": cs, "end": ce})
                cur, cs = "", None
                continue
            if cs is None:
                cs = al["starts"][k]
            cur += ch
            ce = al["ends"][k]
        if cur:
            ws.append({"text": cur, "start": cs, "end": ce})
        per.append(ws)
    total = audio_duration(raw)
    out = []
    for i, ws in enumerate(per):
        if not ws:
            raise StageError(f"beat {i}: no words in single take")
        head = max(0.0, ws[0]["start"] - 0.04)
        nxt = per[i + 1][0]["start"] - 0.03 if i + 1 < len(per) else total
        tail = min(total, ws[-1]["end"] + C.VOICE_TAIL_PAD_S, max(ws[-1]["end"] + 0.02, nxt))
        out.append((raw, ws, head, tail, h))
    return out


def stage_voice(topic, force=False):
    load_env()
    script = load_json(topic / "script.json")
    voice = {**C.VOICE_DEFAULT, **(script.get("voice") or {})}
    engine = voice["engine"]
    if engine == "auto":
        engine = "elevenlabs" if _elevenlabs_key_ok(os.environ.get("ELEVENLABS_API_KEY", "")) else "edge"
        if engine == "edge" and os.environ.get("ELEVENLABS_API_KEY"):
            warn("voice", "ELEVENLABS_API_KEY is set but is not a secret key (must start with 'sk_') - using edge-tts")
    vdir = topic / "build" / "voice"
    vdir.mkdir(parents=True, exist_ok=True)

    single = _single_take(script, voice, engine, vdir, force)

    pieces, all_words, beats_out, t = [], [], [], 0.0
    for i, b in enumerate(script["beats"]):
        text, emph = _emphasis_ranges(b["narration"].strip())
        if single:
            raw, words_abs, head, tail, h = single[i]
            words = _attach_source_tokens([dict(w) for w in words_abs], text, emph)
            tempo = float(voice.get("tempo", 1.0))
            seg = vdir / f"take_{h}_{b['id']}_t{tempo:g}.wav"
            af = ["-af", f"atempo={tempo}"] if abs(tempo - 1) > 1e-3 else []
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{head:.3f}", "-to", f"{tail:.3f}", "-i", str(raw),
                 *af, "-ac", "1", "-ar", str(SR), str(seg)])  # input-side seek: times are source times
            seg_len = audio_duration(seg)
            pause = b.get("pause_after_ms", C.BEAT_GAP_MS) / 1000.0
            if i == 0:
                t = 0.15
                pieces.append(("silence", t))
            start = t
            for w in words:
                all_words.append({
                    "beat": b["id"], "text": w["display"], "punct": w["punct"], "emph": w["emph"],
                    "start": round(t + (w["start"] - head) / tempo, 3), "end": round(t + (w["end"] - head) / tempo, 3)})
            pieces.append(("file", seg))
            t += seg_len
            beats_out.append({"id": b["id"], "start": round(start, 3), "speech_end": round(t, 3)})
            if pause > 0.001:
                pieces.append(("silence", pause))
            t += pause
            continue
        h = hashlib.sha1(json.dumps([text, b.get("v3_tag"), engine, {k: v for k, v in voice.items() if k != "tempo"}], sort_keys=True).encode()).hexdigest()[:10]
        raw, meta = vdir / f"{b['id']}_{h}.mp3", vdir / f"{b['id']}_{h}.json"
        if force or not (raw.exists() and meta.exists()):
            log("voice", f"TTS {b['id']} ({engine}): {text[:60]}...")
            tag = b.get("v3_tag")
            if engine == "elevenlabs" and tag and voice["elevenlabs_model"].startswith("eleven_v3"):
                words = _tts_elevenlabs(f"[{tag}] {text}", voice, raw)
            else:
                words = _tts_elevenlabs(text, voice, raw) if engine == "elevenlabs" else _tts_edge(text, voice, raw)
            if not words:
                raise StageError(f"{b['id']}: TTS returned no word timings")
            save_json(meta, words)
        words = _attach_source_tokens(load_json(meta), text, emph)
        head = max(0.0, words[0]["start"] - 0.04)
        tail = min(audio_duration(raw), words[-1]["end"] + C.VOICE_TAIL_PAD_S)
        tempo = float(voice.get("tempo", 1.0))
        seg = vdir / f"{b['id']}_{h}_t{tempo:g}_trim.wav"
        af = ["-af", f"atempo={tempo}"] if abs(tempo - 1) > 1e-3 else []
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{head:.3f}", "-to", f"{tail:.3f}", "-i", str(raw),
             *af, "-ac", "1", "-ar", str(SR), str(seg)])  # input-side seek: times are source times
        seg_len = audio_duration(seg)
        pause = b.get("pause_after_ms", C.BEAT_GAP_MS) / 1000.0
        if i == 0:
            t = 0.15  # tiny breath before first word so the cut-in isn't clipped
            pieces.append(("silence", t))
        start = t
        for w in words:
            all_words.append({
                "beat": b["id"], "text": w["display"], "punct": w["punct"], "emph": w["emph"],
                "start": round(t + (w["start"] - head) / tempo, 3), "end": round(t + (w["end"] - head) / tempo, 3)})
        pieces.append(("file", seg))
        t += seg_len
        beats_out.append({"id": b["id"], "start": round(start, 3), "speech_end": round(t, 3)})
        if pause > 0.001:  # a 0-length anullsrc never ends
            pieces.append(("silence", pause))
        t += pause

    # concat via a single ffmpeg filter graph
    inputs, labels = [], []
    for kind, v in pieces:
        if kind == "file":
            inputs += ["-i", str(v)]
        else:
            inputs += ["-f", "lavfi", "-t", f"{v:.3f}", "-i", f"anullsrc=r={SR}:cl=mono"]
        labels.append(f"[{len(labels)}:a]")
    out = topic / "build" / "voice.wav"
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex",
         "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[a]", "-map", "[a]", "-ar", str(SR), str(out)])
    total = audio_duration(out)
    save_json(topic / "build" / "alignment.json",
              {"engine": engine, "voice": voice["edge_voice"] if engine == "edge" else voice["elevenlabs_voice_id"],
               "duration": round(total, 3), "beats": beats_out, "words": all_words})
    wps = len(all_words) / max(1e-6, sum(b["speech_end"] - b["start"] for b in beats_out))
    # G3 pace: words over the whole narration (pauses included) = what the viewer feels
    spoken = beats_out[-1]["speech_end"] if beats_out else total
    pace = len(all_words) / max(1e-6, spoken)
    log("voice", f"voice.wav {total:.1f}s, {len(all_words)} words, pace {pace:.2f} words/s "
                 f"({pace * 60:.0f} wpm; {wps:.2f} w/s inside speech), engine={engine}")
    if pace < C.PACE_MIN_WPS:
        warn("voice", f"pace {pace:.2f} words/s is too slow (target {C.PACE_MIN_WPS}-{C.PACE_MAX_WPS}): "
                      "top faceless channels run 200+ wpm; shorten pause_after_ms / raise rate")
    elif pace > C.PACE_MAX_WPS:
        warn("voice", f"pace {pace:.2f} words/s is above {C.PACE_MAX_WPS} - too rushed for a real victim's story")
    src_words = sum(len(strip_markup(b['narration']).split()) for b in script["beats"])
    if abs(src_words - len(all_words)) > max(3, 0.05 * src_words):
        warn("voice", f"engine returned {len(all_words)} words for {src_words} source words - check numbers/abbreviations")
    return out
