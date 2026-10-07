"""Stage: qc. Objective, automated checks on a finished video + review material
(1 fps contact sheets and per-shot frames) for the video-critic agent."""
import json
import re

import cv2
from PIL import Image, ImageDraw, ImageFont

from . import config as C
from .util import load_json, log, run, save_json, warn


def _font(size):
    for p in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _extract(video, t, out, w=540):
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1",
         "-vf", f"scale={w}:-2", "-q:v", "3", str(out)])


def contact_sheets(video, duration, out_dir, words):
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = out_dir / "_f"
    tmp.mkdir(exist_ok=True)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vf", "fps=1,scale=270:480", "-q:v", "4",
         str(tmp / "f_%04d.jpg")])
    frames = sorted(tmp.glob("f_*.jpg"))
    font = _font(20)
    sheets, per = [], 12
    for si in range(0, len(frames), per):
        sheet = Image.new("RGB", (4 * 270, 3 * 530), "black")
        for k, fp in enumerate(frames[si:si + per]):
            t = si + k + 0.5  # fps filter samples mid-second
            im = Image.open(fp)
            x, y = (k % 4) * 270, (k // 4) * 530
            sheet.paste(im, (x, y))
            said = " ".join(w["text"] for w in words if t - 0.5 <= w["start"] < t + 0.5)
            d = ImageDraw.Draw(sheet)
            d.text((x + 6, y + 482), f"{t:4.1f}s", fill="yellow", font=font)
            d.text((x + 6, y + 504), said[:30], fill="white", font=_font(15))
        p = out_dir / f"sheet_{si // per + 1:02d}.jpg"
        sheet.save(p, quality=85)
        sheets.append(p)
    for f in frames:
        f.unlink()
    tmp.rmdir()
    return sheets


def _letterbox_samples(video, dur, skip=()):
    """Real bars are black AND flat. Dark photos have texture/grain, so they don't count.
    Returns (boxed_count, samples) over 2 fps samples, ignoring the final fade."""
    import subprocess
    import numpy as np
    w, h = 108, 192
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-t", f"{max(0.0, dur - 0.8):.2f}",
                          "-vf", f"fps=2,scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    boxed = 0
    for i, f in enumerate(frames):
        t = (i + 0.5) / 2
        if any(a <= t < b for a, b in skip):  # generated cards are dark full-frame by design
            continue
        flat = (f.mean(axis=1) < 14) & (f.std(axis=1) < 3.0)

        def run(v):
            n = 0
            for x in v:
                if not x:
                    break
                n += 1
            return n
        if max(run(flat), run(flat[::-1])) >= h * 0.10:
            boxed += 1
    return boxed, frames


def _gray_thumb(video, t, w=64, h=114):
    """64x114 grayscale thumbnail of the frame at t seconds (float32 array) or None."""
    import subprocess
    import numpy as np
    # t < 0 = seconds before the end (-sseof): seeking to dur - 1 frame can land past the last video frame
    seek = ["-sseof", f"{t:.3f}"] if t < 0 else ["-ss", f"{max(0.0, t):.3f}"]
    raw = subprocess.run(["ffmpeg", "-v", "error", *seek, "-i", str(video), "-frames:v", "1",
                          "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    if len(raw) < w * h:
        return None
    return np.frombuffer(raw[:w * h], np.uint8).reshape(h, w).astype(np.float32)


def loop_similarity(video, dur):
    """G1: 1 - mean abs diff (0..1) between the first and last frame; 1 = identical."""
    a = _gray_thumb(video, 0.0)
    b = _gray_thumb(video, -0.25)
    if a is None or b is None:
        return None
    return round(1.0 - float(abs(a - b).mean()) / 255.0, 3)


def picture_changes(tl, speech_end):
    """G8: times (s) a new picture appears: every shot start after 0, plus callouts drawing on.
    Returns (changes_per_10s, longest_gap_s, gap_at_s) over the spoken part (the final hold is excluded)."""
    ts = []
    for sh in tl["shots"]:
        t0 = sh["from"] / C.FPS
        if t0 > 0:
            ts.append(t0)
        co = sh.get("callout")
        if co:
            ts.append(t0 + float(co.get("at_s", 0) or 0))
    end = speech_end if speech_end > 0 else tl["durationInFrames"] / C.FPS
    ts = sorted(t for t in ts if t < end)
    edges = [0.0] + ts + [end]
    gaps = [(edges[i + 1] - edges[i], edges[i]) for i in range(len(edges) - 1)]
    longest, at = max(gaps) if gaps else (end, 0.0)
    return round(len(ts) / max(1e-6, end) * 10, 2), round(longest, 2), round(at, 2)


def stage_qc(topic, video, out_dir):
    tl = load_json(topic / "build" / "timeline.json")
    al = load_json(topic / "build" / "alignment.json")
    results, fails, warns = {}, [], []

    pr = json.loads(run(["ffprobe", "-v", "error", "-show_entries",
                         "stream=codec_type,codec_name,width,height,r_frame_rate,bit_rate:format=duration,bit_rate",
                         "-of", "json", str(video)]).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    a = next((s for s in pr["streams"] if s["codec_type"] == "audio"), None)
    dur = float(pr["format"]["duration"])
    results["format"] = {"width": v["width"], "height": v["height"], "fps": v["r_frame_rate"], "vcodec": v["codec_name"],
                         "acodec": a and a["codec_name"], "duration": round(dur, 2),
                         "video_kbps": int(v.get("bit_rate", 0)) // 1000}
    if (v["width"], v["height"]) != (C.WIDTH, C.HEIGHT):
        fails.append(f"resolution {v['width']}x{v['height']}")
    if not a:
        fails.append("no audio stream")
    if not (C.DURATION_MIN <= dur <= C.DURATION_MAX):
        fails.append(f"duration {dur:.1f}s outside {C.DURATION_MIN}-{C.DURATION_MAX}s")
    kb = results["format"]["video_kbps"]
    if kb < 8000:
        warns.append(f"video bitrate {kb} kbps below the 10-16 Mbps master spec")
    if kb > 25000:
        fails.append(f"video bitrate {kb} kbps above Instagram's 25 Mbps cap")
    size_mb = video.stat().st_size / 1e6
    if size_mb > 300:
        fails.append(f"file {size_mb:.0f} MB > 300 MB (Instagram API limit)")

    # Loudness
    r = run(["ffmpeg", "-hide_banner", "-i", str(video), "-af", "loudnorm=print_format=json", "-f", "null", "-"])
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S).group(0))
    lufs, tp = float(m["input_i"]), float(m["input_tp"])
    results["loudness"] = {"lufs": lufs, "true_peak": tp}
    if abs(lufs - C.TARGET_LUFS) > C.LUFS_TOLERANCE:
        fails.append(f"loudness {lufs} LUFS (target {C.TARGET_LUFS})")
    if tp > C.TARGET_TP + 0.3:
        fails.append(f"true peak {tp} dBTP (max {C.TARGET_TP})")

    # Black / frozen / letterboxed frames
    r = run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf",
             f"blackdetect=d=0.15:pix_th=0.08,freezedetect=n=0.002:d={C.FREEZE_MAX_S}", "-an", "-f", "null", "-"])
    blacks = [(float(s), float(e)) for s, e in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", r.stderr)]
    blacks = [(s, e) for s, e in blacks if e - s > C.BLACK_MAX_S and s < dur - 0.8]
    freezes = re.findall(r"freeze_start: ([\d.]+)", r.stderr)
    cards = [(x["from"] / C.FPS, (x["from"] + x["duration"]) / C.FPS) for x in tl["shots"] if x["treatment"] == "card"]
    boxed, crops = _letterbox_samples(video, dur, cards)
    results["black_segments"] = blacks
    results["freeze_starts"] = [float(x) for x in freezes]
    results["letterboxed_sample_ratio"] = round(boxed / max(1, len(crops)), 3)
    if blacks:
        fails.append(f"{len(blacks)} black segment(s): {blacks[:3]}")
    if freezes:
        fails.append(f"frozen picture > {C.FREEZE_MAX_S}s at {freezes[:3]}")
    if boxed / max(1, len(crops)) > 0.05:
        fails.append(f"{boxed}/{len(crops)} sampled frames look letterboxed")

    # Structural checks from the timeline
    shots = tl["shots"]
    cap_words = sum(len(p["words"]) for p in tl["captions"])
    if cap_words != len(al["words"]):
        fails.append(f"captions cover {cap_words} of {len(al['words'])} spoken words")
    first_cut = shots[1]["from"] / C.FPS if len(shots) > 1 else dur
    if first_cut > C.FIRST_CUT_MAX_S:
        warns.append(f"first cut at {first_cut:.2f}s")
    if not any(o["kind"] == "hook" and o["from"] <= 3 for o in tl["overlays"]):
        fails.append("no on-screen hook text in first 0.1s")
    lens = [s["duration"] / C.FPS for s in shots]
    results["pacing"] = {"shots": len(shots), "avg_s": round(sum(lens) / len(lens), 2), "max_s": round(max(lens), 2),
                         "first_cut_s": round(first_cut, 2)}
    for i in tl.get("issues", []):
        (fails if i["level"] == "error" else warns).append(i["msg"])

    # G8 picture change rate (spoken part only; the planned final hold is excluded)
    speech_end = max((w_["end"] for w_ in al["words"]), default=0.0)
    per10, longest, gap_at = picture_changes(tl, speech_end)
    results["pacing"].update({"picture_changes_per_10s": per10, "longest_static_s": longest, "longest_static_at_s": gap_at})
    if longest > 5.0:
        warns.append(f"no new picture for {longest:.1f}s from {gap_at:.1f}s (max 5 s; explaining stretches change every <= 2.5 s)")

    # G3 pace from the alignment (pauses included)
    spoken = (al["beats"][-1]["speech_end"] if al.get("beats") else speech_end) or dur
    wps = round(len(al["words"]) / max(1e-6, spoken), 2)
    results["words_per_second"] = wps
    if wps < C.PACE_MIN_WPS:
        warns.append(f"pace {wps} words/s below {C.PACE_MIN_WPS} (shorten pause_after_ms / raise rate)")

    # G1 loop: first vs last frame
    edl_p = topic / "edl.json"
    loop = bool(load_json(edl_p).get("loop")) if edl_p.exists() else False
    sim = loop_similarity(video, dur)
    results["loop_similarity"] = sim
    results["loop"] = loop
    if loop and sim is not None and sim < 0.5:
        warns.append(f"edl.loop is true but first/last frame similarity is {sim} (< 0.5) - the replay seam will show")

    # Review material + sharpness per shot
    rev = out_dir / "review"
    shot_dir = rev / "shots"
    shot_dir.mkdir(parents=True, exist_ok=True)
    sharp = []
    for s in shots:
        t = (s["from"] + s["duration"] * 0.5) / C.FPS
        p = shot_dir / f"{s['id']}.jpg"
        _extract(video, t, p)
        g = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
        # sharpness of the picture region only (skip caption band)
        region = g[int(g.shape[0] * 0.12): int(g.shape[0] * 0.58)]
        sharp.append((s["id"], round(float(cv2.Laplacian(region, cv2.CV_64F).var()), 1)))
    results["sharpness"] = dict(sharp)
    soft = [sid for sid, val in sharp if val < 25]
    if soft:
        warns.append(f"soft-looking shots (laplacian var < 25): {soft}")
    sheets = contact_sheets(video, dur, rev, al["words"])
    results["review_material"] = {"sheets": [str(p.relative_to(topic)) for p in sheets],
                                  "shot_frames": str(shot_dir.relative_to(topic))}

    verdict = "PASS" if not fails else "FAIL"
    qc = {"verdict": verdict, "fails": fails, "warnings": warns, **results}
    save_json(out_dir / "qc.json", qc)
    log("qc", f"{verdict}: {len(fails)} fail(s), {len(warns)} warning(s); {lufs} LUFS, {dur:.1f}s, "
              f"{len(shots)} shots avg {results['pacing']['avg_s']}s")
    for f in fails:
        warn("qc", "FAIL " + f)
    for w in warns:
        warn("qc", w)
    return qc
