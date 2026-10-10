"""'whatif' pipeline CLI.

  python3 -m pipeline.whatif.run timeline <topic>              scenario.json + world.json -> build/timeline.json
  python3 -m pipeline.whatif.run stills <topic> [f1,f2,..]     one still per beat (or given frames) -> build/stills/sheet.jpg
  python3 -m pipeline.whatif.run preview <topic> [a-b]         low-res silent render -> build/preview.mp4
  python3 -m pipeline.whatif.run produce <topic> [--draft]     timeline -> render -> sound -> mux -> qc -> publish.md (--draft = half res)
  python3 -m pipeline.whatif.run remix <topic>                 regenerate sound onto the latest render
"""
import hashlib
import json
import shutil
import sys

from ..run import _next_version
from ..util import ROOT, StageError, die, load_json, log, run, topic_path, warn
from .sound import stage_sound
from .timeline import build


def _render(topic, out, extra=()):
    log("render", f"rendering {out.name} ...")
    run(["npx", "tsx", "src/renderWhatIf.ts", str(topic), str(out), *extra], capture=True)


def stills(topic, frames=None):
    tl = build(topic)
    if not frames:
        frames = [min(b["to"] - 2, b["from"] + int((b["to"] - b["from"]) * 0.7)) for b in tl["beats"]]
        if tl.get("endCard"):
            frames.append(tl["endCard"]["from"] + 20)
    sd = topic / "build" / "stills"
    shutil.rmtree(sd, ignore_errors=True)
    run(["npx", "tsx", "src/renderWhatIf.ts", str(topic), "x", f"--stills={','.join(map(str, frames))}", "--scale=0.4"])
    run(["ffmpeg", "-y", "-v", "error", "-pattern_type", "glob", "-i", str(sd / "still_*.jpg"),
         "-filter_complex", f"tile={len(frames)}x1", "-frames:v", "1", "-q:v", "3", str(sd / "sheet.jpg")])
    log("stills", f"{len(frames)} frames -> {(sd / 'sheet.jpg').relative_to(ROOT)}")


def qc(final, tl):
    fails, warns = [], []
    dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(final)]).stdout)
    want = tl["durationInFrames"] / tl["fps"]
    if abs(dur - want) > 0.2:
        fails.append(f"duration {dur:.2f}s != timeline {want:.2f}s")
    r = run(["ffmpeg", "-hide_banner", "-i", str(final), "-af", "ebur128=peak=true", "-f", "null", "-"])
    tail = r.stderr[r.stderr.rfind("Summary:"):]
    lufs = float(tail.split("I:")[1].split("LUFS")[0])
    if abs(lufs + 14) > 1.0:
        fails.append(f"loudness {lufs} LUFS (target -14)")
    r = run(["ffmpeg", "-hide_banner", "-i", str(final), "-vf", "blackdetect=d=0.5:pix_th=0.04", "-an", "-f", "null", "-"])
    blacks = [ln for ln in r.stderr.splitlines() if "black_start" in ln]
    if blacks:
        warns.append(f"{len(blacks)} black stretch(es) >= 0.5 s: " + "; ".join(b.split("]")[-1].strip() for b in blacks[:3]))
    return {"verdict": "PASS" if not fails else "FAIL", "fails": fails, "warnings": warns, "duration": round(dur, 2), "lufs": lufs}


def export(topic, vdir, tl):
    sc = load_json(topic / "scenario.json")
    research = load_json(topic / "research.json")
    pub = sc.get("publish") or {}
    # cover: a frame from the hook beat with the title on it
    t = (tl["title"]["to"] * 0.6) / tl["fps"]
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", str(vdir / "final.mp4"), "-frames:v", "1", "-q:v", "2", str(vdir / "cover.jpg")])
    lines = [f"# {pub.get('title', sc['title'])}", "", "## Title options", ""]
    lines += [f"{i}. {x}" for i, x in enumerate(pub.get("titles") or [sc["title"]], 1)]
    lines += ["", "## Description", "", pub.get("description", ""), "", "## Hashtags", "", " ".join(pub.get("hashtags", []))]
    if pub.get("pinned_comment"):
        lines += ["", "## Pinned comment", "", pub["pinned_comment"]]
    if pub.get("comment_prompt"):
        lines += ["", "## Comment prompt", "", pub["comment_prompt"]]
    lines += ["", "## Sources", ""] + [f"- {s.get('title', '')} - {s['url']}" for s in research.get("sources", [])[:10]]
    lines += ["", "## Notes", "", "- 1080x1920 H.264/AAC, -14 LUFS. All visuals and sound are generated (no third-party media).",
              "- Simulation/visualisation of a hypothetical; numbers are sourced (see above)."]
    (vdir / "publish.md").write_text("\n".join(lines) + "\n")


def produce(topic, draft=False):
    tl = build(topic)
    renderer = "".join(p.read_text() for p in sorted((ROOT / "src" / "whatif").rglob("*.ts*")))
    h = hashlib.sha1((json.dumps(tl, sort_keys=True) + renderer + str(draft)).encode()).hexdigest()[:10]
    cached = topic / "build" / f"render_{h}.mp4"
    if not cached.exists():
        for old in (topic / "build").glob("render_*.mp4"):
            old.unlink()
        _render(topic, cached, ["--scale=0.5"] if draft else [])
    else:
        log("render", "picture unchanged - reusing")
    vdir = _next_version(topic)
    shutil.copy(cached, vdir / "render.mp4")
    wav = stage_sound(topic, topic / "build" / "sound.wav")
    final = vdir / "final.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(vdir / "render.mp4"), "-i", str(wav), "-map", "0:v", "-map", "1:a",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)])
    for f in ("scenario.json", "world.json"):
        shutil.copy(topic / f, vdir / f)
    q = qc(final, tl)
    (vdir / "qc.json").write_text(json.dumps(q, indent=2) + "\n")
    export(topic, vdir, tl)
    for w in q["warnings"]:
        warn("qc", w)
    log("produce", f"{q['verdict']} {q['fails'] or ''} -> {final.relative_to(ROOT)}")
    return q


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    cmd, topic = argv[0], topic_path(argv[1])
    try:
        if cmd == "timeline":
            build(topic)
        elif cmd == "stills":
            stills(topic, [int(x) for x in argv[2].split(",")] if len(argv) > 2 else None)
        elif cmd == "preview":
            build(topic)
            _render(topic, topic / "build" / "preview.mp4", ["--scale=0.4"] + ([f"--frames={argv[2]}"] if len(argv) > 2 else []))
        elif cmd == "produce":
            return 0 if produce(topic, draft="--draft" in argv)["verdict"] == "PASS" else 3
        elif cmd == "remix":
            vdir = (topic / "out" / "latest").resolve()
            wav = stage_sound(topic, topic / "build" / "sound.wav")
            run(["ffmpeg", "-y", "-v", "error", "-i", str(vdir / "render.mp4"), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                 "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(vdir / "final.mp4")])
            log("remix", f"-> {(vdir / 'final.mp4').relative_to(ROOT)}")
        else:
            print(__doc__)
            return 1
    except StageError as ex:
        die(str(ex))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
