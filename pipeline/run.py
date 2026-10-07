"""Pipeline CLI. Every stage is runnable on its own against a topic dir.

  python3 -m pipeline.run init <slug>                 create topics/<slug>/ skeleton
  python3 -m pipeline.run check <what> <topic>        what = research|catalog|script|edl|all
  python3 -m pipeline.run enhance <topic> [--force]   restore/upscale photos -> materials/enhanced (catalog.enhanced)
  python3 -m pipeline.run audition <topic>           cast narrator voice (samples + scores)
  python3 -m pipeline.run sfx-gen x                   generate own SFX library (ElevenLabs) -> assets/sfx
  python3 -m pipeline.run music-scan x                analyze assets/music (energy per 5s) -> library.json
  python3 -m pipeline.run voice <topic> [--force]     script.json -> build/voice.wav + alignment.json
  python3 -m pipeline.run timeline <topic>            edl.json + alignment -> build/timeline.json
  python3 -m pipeline.run still <topic> <frame>       render one frame -> build/still_<frame>.jpg
  python3 -m pipeline.run preview <topic> <a-b>       render a frame range (silent) -> build/preview.mp4
  python3 -m pipeline.run produce <topic>             voice -> timeline -> render -> mix -> qc -> export
  python3 -m pipeline.run remix <topic>               re-mix audio onto latest render (no video render)
  python3 -m pipeline.run qc <topic>                  re-run QC on out/latest/final.mp4
"""
import hashlib
import json
import os
import shutil
import sys
import time

from . import checks
from .audio import stage_mix
from .qc import stage_qc
from .timeline import stage_timeline
from .util import ROOT, StageError, die, load_json, log, run, save_json, topic_path, warn
from .voice import stage_voice


def cmd_check(what, topic):
    names = list(checks.CHECKS) if what == "all" else [what]
    bad = False
    for n in names:
        e, w = checks.CHECKS[n](topic)
        status = "\033[1;32mPASS\033[0m" if not e else "\033[1;31mFAIL\033[0m"
        print(f"check {n}: {status} ({len(e)} errors, {len(w)} warnings)")
        for x in e:
            print(f"  ERROR {x}")
        for x in w:
            print(f"  warn  {x}")
        bad |= bool(e)
    return not bad


def require(topic, *names):
    for n in names:
        e, _ = checks.CHECKS[n](topic)
        if e:
            raise StageError(f"{n} check failed - run `python3 -m pipeline.run check {n} {topic.relative_to(ROOT)}`:\n  "
                             + "\n  ".join(e[:8]))


def _render(topic, out, frames=None):
    cmd = ["npx", "tsx", "src/renderShort.ts", str(topic), str(out)]
    if frames:
        cmd.append(f"--frames={frames}")
    log("render", f"rendering {out.name} ...")
    t = time.time()
    r = run(cmd, capture=True)
    log("render", f"done in {time.time() - t:.0f}s")
    return r


def _next_version(topic):
    od = topic / "out"
    od.mkdir(exist_ok=True)
    nums = [int(p.name[1:]) for p in od.glob("v*") if p.name[1:].isdigit()]
    v = od / f"v{max(nums, default=0) + 1}"
    v.mkdir()
    link = od / "latest"
    if link.is_symlink() or link.exists():
        link.unlink()
    link.symlink_to(v.name)
    return v


def stage_export(topic, vdir):
    script = load_json(topic / "script.json")
    research = load_json(topic / "research.json")
    edl = load_json(topic / "edl.json")
    tl = load_json(topic / "build" / "timeline.json")
    final = vdir / "final.mp4"
    cover_note = None
    if tl.get("cover"):
        # G5: designed cover (one picture, <= 4 words, red keyword) from the Cover composition
        try:
            run(["npx", "tsx", "src/renderShort.ts", str(topic), str(vdir / "cover.jpg"), "--cover"], capture=True)
            cover_note = f"cover.jpg (Cover composition: \"{tl['cover']['text']}\" on {os.path.basename(tl['cover']['src'])})"
        except Exception as ex:  # noqa: BLE001 - fall back to a video frame
            warn("export", f"cover render failed ({str(ex)[:200]}) - using a video frame")
    if not cover_note:
        cover_shot = (edl.get("cover") or {}).get("shot") or tl["shots"][0]["id"]
        s = next((x for x in tl["shots"] if x["id"] == cover_shot), tl["shots"][0])
        t = (s["from"] + min(s["duration"] - 1, 20)) / tl["fps"]
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(final), "-frames:v", "1", "-q:v", "2",
             str(vdir / "cover.jpg")])
        cover_note = f"cover.jpg (frame of shot {cover_shot})"
    pub = script.get("publish") or {}
    title = pub.get("title", script["title"])
    lines = [f"# {title}", ""]
    # G5/G7: title variants (short, withhold the answer), series identity, comment loop
    titles = [x for x in (pub.get("titles") or []) if x] or [title]
    lines += ["## Title options", ""] + [f"{i}. {x}" for i, x in enumerate(titles, 1)] + [""]
    if pub.get("series"):
        ep = pub.get("episode")
        lines += [f"Series: {pub['series']}" + (f" · #{ep}" if ep not in (None, "") else ""), ""]
    lines += ["## Description", "", pub.get("description", ""), ""]
    music = edl.get("music") or {}
    lib = ROOT / "assets" / "music" / "library.json"
    if music.get("src") and lib.exists():
        entry = next((x for x in load_json(lib)["tracks"] if x["file"] == os.path.basename(music["src"])), None)
        if entry:
            lines += [entry["attribution"], ""]
    cat = load_json(topic / "catalog.json")["materials"]
    used = {x["src"] for x in tl["shots"]}
    used_names = {m["filename"] for m in cat if any(os.path.splitext(m["filename"])[0] in u for u in used)}
    credits = [m for m in cat if m["filename"] in used_names and m.get("rights") in ("wikimedia_cc", "stock_licensed", "news_media", "public_record")]
    if credits:
        srcs = list(dict.fromkeys(m.get("attribution") or m["source_url"] for m in credits if m.get("source_url")))
        lines += ["Visual sources:"] + [f"- {x}" for x in srcs] + [""]
    lines += ["## Hashtags", "", " ".join(pub.get("hashtags", [])), "", "## Sources (keep for fact-check / pinned comment)", ""]
    lines += [f"- {x if isinstance(x, str) else x.get('url')}" for x in research.get("sources", [])[:8]]
    if pub.get("pinned_comment"):
        lines += ["", "## Pinned comment", "", pub["pinned_comment"]]
    if pub.get("comment_prompt"):
        lines += ["", "## Comment prompt", "", pub["comment_prompt"]]
    lines += ["", "## Platform notes", "",
              "- One file for all three: 1080x1920, H.264, AAC, -14 LUFS. Shorts/TikTok/Reels all accept it as-is.",
              "- Narration is a synthetic (AI) voice: tick the platform's AI/altered-content disclosure where required.",
              "- Footage includes news/police material: keep commentary framing; expect possible claims on news clips.",
              f"- Cover: {cover_note}."]
    (vdir / "publish.md").write_text("\n".join(lines) + "\n")
    log("export", f"cover.jpg + publish.md -> {vdir.relative_to(ROOT)}")


def cmd_produce(topic, remix_only=False):
    require(topic, "research", "catalog", "script", "edl")
    if remix_only:
        vdir = (topic / "out" / "latest").resolve()
        render = vdir / "render.mp4"
    else:
        stage_voice(topic)
        tl = stage_timeline(topic)
        # cache key = timeline content + renderer source (a renderer-only fix must never reuse a stale render)
        renderer = "".join(p.read_text() for p in sorted((ROOT / "src").rglob("*.ts*")))
        h = hashlib.sha1((json.dumps({k: tl.get(k) for k in ("shots", "captions", "overlays", "durationInFrames",
                                                           "endFade", "captionStyle", "channelMark")},
                                     sort_keys=True) + renderer).encode()).hexdigest()[:10]
        cached = topic / "build" / f"render_{h}.mp4"
        if not cached.exists():
            for old in (topic / "build").glob("render_*.mp4"):
                old.unlink()
            _render(topic, cached)
        else:
            log("render", "video unchanged since last render - reusing")
        vdir = _next_version(topic)
        render = vdir / "render.mp4"
        shutil.copy(cached, render)
    for f in ["script.json", "edl.json"]:
        shutil.copy(topic / f, vdir / f)
    final = stage_mix(topic, render, vdir / "final.mp4")
    qc = stage_qc(topic, final, vdir)
    stage_export(topic, vdir)
    log("produce", f"{qc['verdict']} -> {final.relative_to(ROOT)}")
    return qc


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    cmd = argv[0]
    try:
        if cmd == "init":
            t = ROOT / "topics" / argv[1]
            for d in ["materials", "build", "out", "scripts"]:
                (t / d).mkdir(parents=True, exist_ok=True)
            print(t)
            return 0
        if cmd == "sfx-gen":
            from .sfxlib import generate
            generate(force="--force" in argv)
            return 0
        if cmd == "music-scan":
            from .music import scan
            scan()
            return 0
        if cmd == "check":
            return 0 if cmd_check(argv[1], topic_path(argv[2])) else 2
        topic = topic_path(argv[1])
        if cmd == "voice":
            require(topic, "script", "story")   # no voice before the story audit passes (stage 3a)
            stage_voice(topic, force="--force" in argv)
        elif cmd == "enhance":
            from .enhance import stage_enhance
            stage_enhance(topic, force="--force" in argv)
        elif cmd == "audition":
            from .audition import audition
            audition(topic)
        elif cmd == "timeline":
            require(topic, "catalog", "script", "edl")
            if not (topic / "build" / "alignment.json").exists():
                stage_voice(topic)
            stage_timeline(topic)
        elif cmd == "still":
            f = int(argv[2])
            run(["npx", "tsx", "src/renderShort.ts", str(topic), "x", f"--still={f}:{topic}/build/still_{f}.jpg"])
            print(topic / "build" / f"still_{f}.jpg")
        elif cmd == "preview":
            _render(topic, topic / "build" / "preview.mp4", argv[2])
        elif cmd == "produce":
            qc = cmd_produce(topic)
            return 0 if qc["verdict"] == "PASS" else 3
        elif cmd == "remix":
            cmd_produce(topic, remix_only=True)
        elif cmd == "qc":
            v = (topic / "out" / "latest").resolve()
            stage_qc(topic, v / "final.mp4", v)
        else:
            print(__doc__)
            return 1
    except StageError as ex:
        die(str(ex))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
