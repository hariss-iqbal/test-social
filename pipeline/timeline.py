import re
"""Stage: timeline. edl.json + build/alignment.json -> build/media/* + build/timeline.json

The director (LLM) decides WHAT is on screen and on which spoken word it cuts.
This stage decides WHEN, in frames, from the real voice timings. Nothing here
is estimated from word counts."""
import hashlib
import math

from . import config as C
from .util import StageError, load_json, log, norm_word, probe, run, save_json, warn

FPS = C.FPS
FUNCTION_WORDS = {"the", "a", "an", "to", "of", "and", "in", "on", "at", "for", "from", "with", "her", "his", "was", "is"}


def _prep_image(src, dst_dir):
    info = probe(src)
    short = min(info["width"], info["height"])
    factor = 1.0
    if short < 1400:
        factor = min(3.0, 1400 / short)
    h = hashlib.sha1(f"{src.stat().st_mtime}{factor}".encode()).hexdigest()[:8]
    out = dst_dir / f"{src.stem}_{h}.jpg"
    if not out.exists():
        w2, h2 = round(info["width"] * factor / 2) * 2, round(info["height"] * factor / 2) * 2
        vf = f"scale={w2}:{h2}:flags=lanczos"
        if factor > 1.2:
            vf += ",unsharp=5:5:0.6:5:5:0"
        run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vf", vf, "-q:v", "2", str(out)])
    p = probe(out)
    return out, p["width"], p["height"], info


def _prep_video(src, dst_dir):
    info = probe(src)
    short = min(info["width"], info["height"])
    factor = 1
    if short < 480:
        factor = 4 if short < 200 else 3
    h = hashlib.sha1(f"{src.stat().st_mtime}{factor}v3".encode()).hexdigest()[:8]
    out = dst_dir / f"{src.stem}_{h}.mp4"
    if not out.exists():
        vf = f"fps={FPS}"
        if factor > 1:
            # honest restoration only (no GAN on evidence footage): deblock, temporal denoise, lanczos
            vf += f",deblock=filter=strong:block=8,hqdn3d=3:3:6:6,scale=iw*{factor}:ih*{factor}:flags=lanczos,unsharp=5:5:0.6:5:5:0"
        vf += ",scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p"
        log("timeline", f"prep video {src.name} (x{factor})")
        run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vf", vf, "-an", "-c:v", "libx264",
             "-crf", "16", "-preset", "medium", "-g", "15", str(out)])
    p = probe(out)
    return out, p["width"], p["height"], info


def _autocrop(path, kind):
    """Normalized [x,y,w,h] of the picture inside baked-in black borders (None if no borders)."""
    import re as _re
    if kind == "video":
        r = run(["ffmpeg", "-hide_banner", "-i", str(path), "-vf", "fps=2,cropdetect=limit=24:round=2:reset=0",
                 "-an", "-f", "null", "-"])
        m = _re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", r.stderr)
        if not m:
            return None
        w, h, x, y = map(int, m[-1])
        info = probe(path)
        W, H = info["width"], info["height"]
    else:
        import cv2
        g = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        if g is None:
            return None
        H, W = g.shape
        rows = (g > 24).mean(axis=1) > 0.02
        cols = (g > 24).mean(axis=0) > 0.02
        if not rows.any() or not cols.any():
            return None
        y, y2 = rows.argmax(), H - rows[::-1].argmax()
        x, x2 = cols.argmax(), W - cols[::-1].argmax()
        w, h = x2 - x, y2 - y
    if w >= W * 0.97 and h >= H * 0.97:
        return None
    return [round(x / W, 4), round(y / H, 4), round(w / W, 4), round(h / H, 4)]


def _still(video, t, dst_dir, tag):
    out = dst_dir / f"{video.stem}_still_{tag}.jpg"
    if not out.exists():
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-q:v", "3", str(out)])
    return out


def _callout(s, dur_s, issues):
    """G6: validate/normalize edl shot.callout {rect [x,y,w,h] (normalized source coords, like crop/highlight),
    shape circle|box, at_s (default 0.4)}. Returns None when absent or unusable."""
    c = s.get("callout")
    if not c:
        return None
    rect = c.get("rect")
    if not (isinstance(rect, (list, tuple)) and len(rect) == 4 and all(isinstance(v, (int, float)) for v in rect)
            and rect[2] > 0 and rect[3] > 0 and 0 <= rect[0] <= 1 and 0 <= rect[1] <= 1):
        issues.append(("error", f"shot {s['id']}: callout.rect must be [x,y,w,h] normalized 0-1, got {rect}"))
        return None
    shape = c.get("shape", "circle")
    if shape not in ("circle", "box"):
        issues.append(("error", f"shot {s['id']}: callout.shape must be circle|box, got {shape!r}"))
        return None
    at = float(c.get("at_s", 0.4))
    if at + 8 / FPS > dur_s - 0.3:
        issues.append(("warn", f"shot {s['id']}: callout at {at:.2f}s barely shows in a {dur_s:.2f}s shot"))
    return {"rect": [round(float(v), 4) for v in rect], "shape": shape, "at_s": round(at, 3)}


def _prep_cover(topic, edl, cat, media_dir, issues):
    """G5: edl.cover {material, focus, crop?, text, keyword, circle?} -> timeline.cover (prepared media + dims)."""
    cv = edl.get("cover")
    if not cv or not cv.get("material") or not cv.get("text"):
        return None
    mat = cv["material"]
    m = cat.get(mat)
    if not m:
        issues.append(("error", f"cover: material {mat} not in catalog"))
        return None
    src = topic / "materials" / (m.get("enhanced") or mat)
    if not src.exists():
        src = topic / "materials" / mat
    if m["type"] == "video":
        vid, _, _, _ = _prep_video(src, media_dir)
        pth = _still(vid, float(cv.get("src_in", 0.5)), media_dir, "cover")
    else:
        pth, _, _, _ = _prep_image(src, media_dir)
    p = probe(pth)
    crop = cv.get("crop") or _autocrop(src, m["type"])
    words = cv["text"].split()
    if len(words) > 4:
        issues.append(("warn", f"cover: text has {len(words)} words (want <= 4)"))
    return {"src": str(pth.relative_to(topic)), "srcW": p["width"], "srcH": p["height"],
            "focus": cv.get("focus") or [0.5, 0.45], "crop": crop, "text": cv["text"],
            "keyword": cv.get("keyword"), "circle": cv.get("circle")}


def _f(sec):
    return int(round(sec * FPS))


def _compact_credit(tag):
    """One-line credits (v6 C27: long ones were cut with '…', losing the year). Keep author, licence, year."""
    if not tag:
        return tag
    t = re.sub(r"^\s*(photo|image|picture|video|footage)\s*:\s*", "", tag, flags=re.I)
    # drop a parenthesised repeat of a name already in the credit, e.g. "Heilbronner Stimme (Stimme TV)" -> "Heilbronner Stimme TV"
    t = re.sub(r"\s*\((\w+)\s+TV\)", r" TV", t)
    t = t.replace(" (Wikimedia)", "").replace(" (Wikimedia Commons)", "").replace("Wikimedia Commons", "Wikimedia")
    t = re.sub(r"\s+", " ", t).strip(" ,")
    return t


def stage_timeline(topic):
    edl = load_json(topic / "edl.json")
    al = load_json(topic / "build" / "alignment.json")
    cat = {m["filename"]: m for m in load_json(topic / "catalog.json")["materials"]}
    media_dir = topic / "build" / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    words = al["words"]
    beats_t = {b["id"]: b for b in al["beats"]}
    beat_ids = [b["beat_id"] for b in edl["beats"]]
    # edl.end_hold_s: a longer silent hold for a name card (STYLE §2 "then silence and the name card"), max 4 s
    hold = min(4.0, float(edl.get("end_hold_s", getattr(C, "END_HOLD_S", 1.0))))
    if edl.get("loop"):
        # loop ending: measured from the last spoken word, not from the end of the voice file (v5 C20: 0.61 s tail)
        total_s = beats_t[beat_ids[-1]]["speech_end"] + hold
    else:
        total_s = al["duration"] + hold - 0.15  # voice already ends with the last pause
        total_s = max(total_s, beats_t[beat_ids[-1]]["speech_end"] + hold)
    total_f = _f(total_s)

    # 1. Beat windows: from (first word - lead) to next beat's start.
    bstart = {}
    for i, bid in enumerate(beat_ids):
        bw = [w for w in words if w["beat"] == bid]
        bstart[bid] = 0.0 if i == 0 else max(0.0, bw[0]["start"] - C.CUT_LEAD_S)

    # 2. Shot starts inside each beat, from cue words; uncued shots are interpolated.
    shots, prepped, errors = [], {}, []
    for i, b in enumerate(edl["beats"]):
        bid = b["beat_id"]
        b0 = bstart[bid]
        b1 = bstart[beat_ids[i + 1]] if i + 1 < len(beat_ids) else total_s
        bw = [w for w in words if w["beat"] == bid]
        anchors, cursor = [], 0
        for j, s in enumerate(b["shots"]):
            if j == 0:
                anchors.append(b0)
                continue
            t = None
            if s.get("cue"):
                cw = norm_word(s["cue"])
                for k in range(cursor, len(bw)):
                    if norm_word(bw[k]["text"]) == cw:
                        t, cursor = bw[k]["start"] - C.CUT_LEAD_S, k + 1
                        break
                if t is None:
                    errors.append(f"shot {s['id']}: cue '{s['cue']}' not spoken in beat {bid}")
            anchors.append(t)
        anchors.append(b1)
        # interpolate missing anchors
        j = 0
        while j < len(anchors):
            if anchors[j] is None:
                k = j
                while anchors[k] is None:
                    k += 1
                a, z = anchors[j - 1], anchors[k]
                for m in range(j, k):
                    anchors[m] = a + (z - a) * (m - j + 1) / (k - j + 1)
                j = k
            j += 1
        for j, s in enumerate(b["shots"]):
            shots.append({**s, "_beat": bid, "_t0": anchors[j], "_t1": anchors[j + 1]})
    if errors:
        raise StageError("; ".join(errors))

    # 3. Frames, media prep, validation of each shot.
    out_shots, issues = [], []
    for idx, s in enumerate(shots):
        f0 = _f(s["_t0"])
        f1 = _f(shots[idx + 1]["_t0"]) if idx + 1 < len(shots) else total_f
        dur_f = f1 - f0
        dur_s = dur_f / FPS
        if s.get("graphic"):
            out_shots.append({
                "id": s["id"], "beat": s["_beat"], "from": f0, "duration": dur_f, "kind": "graphic",
                "scene": s["graphic"]["scene"], "sceneProps": s["graphic"].get("props", {}),
                "src": "", "srcW": 1080, "srcH": 1920, "layout": "cover", "move": "static", "intensity": 1,
                "focus": [0.5, 0.5], "crop": None, "treatment": "card", "transition": s.get("transition", "cut"),
                "overlay": s.get("overlay"),
                "sourceTag": s.get("source_tag") or s["graphic"].get("props", {}).get("source"),
            })
            if dur_s < C.SHOT_MIN_S:
                issues.append(("error", f"shot {s['id']}: {dur_s:.2f}s is shorter than {C.SHOT_MIN_S}s"))
            # a scene's key moment (flip/hit/stamp) must happen on screen, with time to read it after
            for k, v in (s["graphic"].get("props") or {}).items():
                if k.endswith("_frame") and isinstance(v, (int, float)) and v > dur_f - 20:
                    issues.append(("error", f"shot {s['id']}: {s['graphic']['scene']}.{k}={v} but the shot is only {dur_f} frames - "
                                            f"the key moment would be cut off (keep it <= {dur_f - 20})"))
            continue
        mat = s["material"]
        m = cat[mat]
        src = topic / "materials" / (m.get("enhanced") or mat)
        if not src.exists():
            src = topic / "materials" / mat
        if mat not in prepped:
            prepped[mat] = (*(_prep_video if m["type"] == "video" else _prep_image)(src, media_dir),
                            _autocrop(src, m["type"]))
        pth, pw, ph, orig, auto = prepped[mat]
        if not s.get("crop") and auto:
            s["crop"] = auto
        elif s.get("crop") and auto:
            # director crop is in full-frame coords; clamp it inside the real picture area
            c = s["crop"]
            x0, y0 = max(c[0], auto[0]), max(c[1], auto[1])
            x1, y1 = min(c[0] + c[2], auto[0] + auto[2]), min(c[1] + c[3], auto[1] + auto[3])
            if x1 - x0 > 0.05 and y1 - y0 > 0.05:
                s["crop"] = [x0, y0, x1 - x0, y1 - y0]
        kind = m["type"]
        lim = C.SHOT_MAX_VIDEO_S if kind == "video" else C.SHOT_MAX_IMAGE_S
        if dur_s < C.SHOT_MIN_S:
            issues.append(("error", f"shot {s['id']}: {dur_s:.2f}s is shorter than {C.SHOT_MIN_S}s"))
        if dur_s > lim and s.get("move") == "static":
            issues.append(("error", f"shot {s['id']}: static {kind} held {dur_s:.1f}s (max {lim}s)"))
        elif dur_s > lim:
            issues.append(("warn", f"shot {s['id']}: {kind} held {dur_s:.1f}s (max {lim}s) - add a cut"))
        # effective upscale vs ORIGINAL source (prep upscaling doesn't add detail)
        crop = s.get("crop") or [0, 0, 1, 1]
        cw, ch = orig["width"] * crop[2], orig["height"] * crop[3]
        if s["layout"] == "cover":
            up = max(C.WIDTH / cw, C.HEIGHT / ch)
        else:
            up = C.WIDTH * 0.98 / cw
        if s.get("move") in ("push_in", "push_in_fast"):
            up *= 1.12
        if up > C.MAX_UPSCALE_ERR and not m.get("low_res_ok"):
            issues.append(("error", f"shot {s['id']}: {mat} upscaled {up:.1f}x - use contain_blur, a wider crop, or a better source"))
        elif up > C.MAX_UPSCALE_WARN:
            issues.append(("warn", f"shot {s['id']}: {mat} upscaled {up:.1f}x (soft)"))
        shot = {
            "id": s["id"], "beat": s["_beat"], "from": f0, "duration": dur_f, "kind": kind,
            "src": str(pth.relative_to(topic)), "srcW": pw, "srcH": ph,
            "layout": s["layout"], "move": s["move"], "intensity": s.get("intensity", 1.0),
            "focus": s.get("focus") or [0.5, 0.45], "crop": s.get("crop"),
            "treatment": s.get("treatment", "doc"), "transition": s.get("transition", "cut"),
            "overlay": s.get("overlay"),
            # v8 panel: credits on every photo read as clutter - show them on documents/records, or when asked
            "sourceTag": s.get("source_tag") or (m.get("source_label") if (m.get("rights") in ("public_record", "wikimedia_cc", "stock_licensed", "news_media")
                                                   or m.get("subject") == "document") else None),
            "highlight": s.get("highlight"),
            "callout": _callout(s, dur_s, issues),   # G6: red ring/box on the evidence
            "sourcePos": s.get("source_pos"),   # "low": in the caption band after the voice ends (e.g. a silent end card where y 1040 hits a face)
        }
        if kind == "video":
            vdur = probe(pth)["duration"]
            si = float(s.get("src_in", 0))
            rate = float(s.get("speed", 1.0))
            avail = (vdur - si) / rate
            if avail < dur_s:
                new_rate = max(0.5, (vdur - si) / dur_s)
                issues.append(("warn", f"shot {s['id']}: only {avail:.1f}s of footage after src_in for {dur_s:.1f}s shot - slowing to {new_rate:.2f}x"))
                rate = new_rate
                if (vdur - si) / rate < dur_s - 0.05:
                    issues.append(("error", f"shot {s['id']}: footage runs out (needs {dur_s:.1f}s) - choose earlier src_in"))
            shot["startFrom"] = _f(si)
            shot["playbackRate"] = round(rate, 3)
            shot["still"] = str(_still(pth, si + 0.2, media_dir, s["id"]).relative_to(topic))
        out_shots.append(shot)

    # 4. Captions (spec: research/captions-style.md). Pages of 2-4 words / <=28 chars (2 lines of ~14),
    #    broken at punctuation, pauses >= 250 ms and beat changes; hook beat uses 1-2 big words.
    #    Words are revealed as spoken (lead 2 frames); page appears 3 frames before its first word.
    hook_beat = beat_ids[0]
    pages = []

    def make_page(ws):
        pages.append({"from": max(0, _f(ws[0]["start"]) - 3), "big": ws[0]["beat"] == hook_beat, "words": [
            {"text": w["text"], "from": max(0, _f(w["start"]) - 2), "to": _f(w["end"]), "emph": w["emph"]} for w in ws]})

    # Phrases end at sentence/clause punctuation, pauses >= 250 ms, or beat changes. Each phrase is
    # then split into EVEN pages (no one-word leftovers like "WATER." after "SHE WAS IN THE").
    phrases, cur = [], []
    for w in words:
        if cur and (w["start"] - cur[-1]["end"] >= 0.25 or cur[-1]["punct"].strip(" '\"")
                    or w["beat"] != cur[-1]["beat"]):
            phrases.append(cur)
            cur = []
        cur.append(w)
    if cur:
        phrases.append(cur)
    # a one-word phrase (e.g. "twenty-one," between commas) joins a neighbour in the same beat when it fits
    i = 0
    while i < len(phrases):
        ph = phrases[i]
        if len(ph) == 1:
            def fits(a):
                return sum(len(x["text"]) + 1 for x in a) - 1 <= 28
            if i > 0 and phrases[i - 1][-1]["beat"] == ph[0]["beat"] and fits(phrases[i - 1][-2:] + ph):
                phrases[i - 1] = phrases[i - 1] + ph
                phrases.pop(i)
                continue
            if i + 1 < len(phrases) and phrases[i + 1][0]["beat"] == ph[0]["beat"]:
                phrases[i + 1] = ph + phrases[i + 1]
                phrases.pop(i)
                continue
        i += 1

    def split_phrase(ph, max_w, max_c, target):
        """Optimal page breaks for one phrase (DP): even page sizes, no 1-word pages,
        no page ending on a function word, never over the width limit."""
        n = len(ph)
        best = [0.0] + [float("inf")] * n
        prev = [0] * (n + 1)
        for j in range(1, n + 1):
            for i in range(max(0, j - max_w - 1), j):
                pg = ph[i:j]
                c = sum(len(x["text"]) + 1 for x in pg) - 1
                if c > max_c or len(pg) > max_w + (1 if c <= max_c - 4 else 0):
                    continue
                cost = (len(pg) - target) ** 2
                if len(pg) == 1 and n > 1:
                    cost += 40   # v13 panel: a lone "HE'D" page read as a glitch
                if j < n and norm_word(pg[-1]["text"]) in FUNCTION_WORDS:
                    cost += 8
                if best[i] + cost < best[j]:
                    best[j], prev[j] = best[i] + cost, i
        if best[n] == float("inf"):  # fallback: fixed-size chunks
            return [ph[i:i + max_w] for i in range(0, n, max_w)]
        out, j = [], n
        while j > 0:
            out.append(ph[prev[j]:j])
            j = prev[j]
        return out[::-1]

    for ph in phrases:
        big = ph[0]["beat"] == hook_beat
        max_w, max_c, target = (3, 22, 2) if big else (4, 28, 3)
        chunks = split_phrase(ph, max_w, max_c, target)
        for c in chunks:
            make_page(c)
    # never flash a page: pages shorter than MIN_PAGE_F merge into the following page of the same beat
    MIN_PAGE_F = 14
    merged = []
    for p in pages:
        if merged:
            prev = merged[-1]
            prev_len = p["from"] - prev["from"]
            same_phrase = not prev["words"][-1]["text"].rstrip().endswith((".", "?", "!"))
            if prev_len < MIN_PAGE_F and same_phrase and len(prev["words"]) + len(p["words"]) <= 5:
                prev["words"] += p["words"]
                continue
        merged.append(p)
    pages[:] = merged
    for p in pages:  # max one red accent per page
        seen = False
        for w in p["words"]:
            w["emph"] = w["emph"] and not seen
            seen |= w["emph"]
    for i, p in enumerate(pages):
        nxt = pages[i + 1]["from"] if i + 1 < len(pages) else total_f
        last_end = p["words"][-1]["to"]
        silence_after = (nxt - last_end) / FPS
        p["to"] = nxt if silence_after < 0.6 else min(nxt, last_end + 10)
        p["fadeOut"] = silence_after >= 0.6
        if p["to"] <= p["from"]:
            p["to"] = p["from"] + 1

    for s in out_shots:
        s["sourceTag"] = _compact_credit(s.get("sourceTag"))
        if s["sourceTag"] and len(s["sourceTag"]) > 60:
            issues.append(("error", f"shot {s['id']}: credit '{s['sourceTag']}' is {len(s['sourceTag'])} chars - it won't fit one line "
                                    "(max 60); shorten the catalog source_label or set source_tag"))

    # 5. Overlays.
    overlays = []
    ht = edl.get("hook_text")
    if ht:
        overlays.append({"kind": "hook", "text": ht["text"], "from": 0, "to": _f(ht.get("until_s", 2.6))})
        # G2 keeps SOURCE lines off the hook; a credited shot must then still show its credit >= 1 s (v5 compliance C05)
        hook_to = overlays[-1]["to"]
        for s in out_shots:
            if s.get("sourceTag") and s["from"] < hook_to and s["from"] + s["duration"] < hook_to + 4 + _f(1.0):
                issues.append(("error", f"shot {s['id']}: its credit never shows (the shot ends <1 s after the hook) - "
                                        "extend it past the hook or move this picture after the hook"))
    for s in out_shots:
        if s["overlay"]:
            f0 = s["from"] + _f(0.15)
            overlays.append({"kind": "label", "style": s["overlay"]["style"], "text": s["overlay"]["text"],
                             "pos": s["overlay"].get("pos"),   # "low": under the caption band (end cards)
                             "from": f0, "to": s["from"] + s["duration"]})

    # 6. Audio events (rendered into the mix by the audio stage, not Remotion).
    sfx = []
    by_id = {s["id"]: s for s in out_shots}
    for s in shots:
        for x in s.get("sfx", []) or []:
            sfx.append({"type": x["type"], "t": round(by_id[s["id"]]["from"] / FPS + x.get("offset_s", 0.0), 3),
                        "gain": x.get("gain", 0.7)})
    # SFX never start on a spoken word: nudge into the nearest pause (<= 0.8 s away), else leave (the mixer ducks it)
    spans = [(w["start"] - 0.06, w["end"] + 0.06) for w in words]
    for x in sfx:
        if x["type"] == "riser":
            continue
        inside = next(((a, b) for a, b in spans if a <= x["t"] <= b), None)
        if not inside:
            continue
        gaps = [(b1, a2) for (_, b1), (a2, _) in zip(spans, spans[1:]) if a2 - b1 >= 0.12]
        gaps.append((spans[-1][1], spans[-1][1] + 5))
        best = min(gaps, key=lambda g: min(abs(g[0] - x["t"]), abs(g[1] - x["t"])))
        cand = best[0] + 0.03 if abs(best[0] - x["t"]) <= abs(best[1] - x["t"]) else max(best[0], best[1] - 0.25)
        if abs(cand - x["t"]) <= 0.8:
            x["t"] = round(cand, 3)
    music_cues = []
    script = load_json(topic / "script.json")
    for b in script["beats"]:
        cue = b.get("music", "normal")
        if cue != "normal":
            bt = beats_t[b["id"]]
            music_cues.append({"cue": cue, "start": bstart[b["id"]], "end": bt["speech_end"]})

    cover = _prep_cover(topic, edl, cat, media_dir, issues)
    mark = getattr(C, "CHANNEL_MARK", None)
    tl = {
        "fps": FPS, "width": C.WIDTH, "height": C.HEIGHT, "durationInFrames": total_f,
        "shots": out_shots, "captions": pages, "overlays": overlays,
        "safe": {"top": C.SAFE_TOP, "bottom": C.SAFE_BOTTOM, "left": C.SAFE_LEFT, "right": C.SAFE_RIGHT},
        "audio": {"music": edl.get("music"), "sfx": sfx, "music_cues": music_cues},
        "issues": [{"level": a, "msg": b} for a, b in issues],
        # G1: a loop edit cuts straight from the last frame back into frame 1 (no fade to black)
        "endFade": not bool(edl.get("loop")),
        # G9: caption preset ("bold" default, "doc" = sentence-case documentary A/B)
        "captionStyle": edl.get("caption_style", "bold"),
        # G7: optional wordmark, off until the owner names the channel
        "channelMark": mark.strip() if isinstance(mark, str) and mark.strip() else None,
        "cover": cover,
    }
    save_json(topic / "build" / "timeline.json", tl)
    first_cut = out_shots[1]["from"] / FPS if len(out_shots) > 1 else total_s
    log("timeline", f"{len(out_shots)} shots, {total_s:.1f}s, avg shot {total_s / len(out_shots):.2f}s, first cut at {first_cut:.2f}s, {len(pages)} caption pages")
    if first_cut > C.FIRST_CUT_MAX_S:
        issues.append(("warn", f"first cut at {first_cut:.2f}s (want <= {C.FIRST_CUT_MAX_S}s)"))
    for lvl, msg in issues:
        (warn if lvl == "warn" else log)("timeline", ("ERROR " if lvl == "error" else "") + msg)
    errs = [m for lvl, m in issues if lvl == "error"]
    if errs:
        raise StageError(f"{len(errs)} timeline error(s) - fix edl.json")
    return tl
