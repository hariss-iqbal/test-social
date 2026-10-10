"""scenario.json + world.json -> build/timeline.json (Remotion "WhatIf" composition) + build/events.json (for sound).

Timing is text-driven (no voice): each beat has dur_s; the title card overlays the first beat(s).
Params are keyframed at beat starts and reach their target after ramp_s (default 1.0 s), so a beat can
"snap" (ramp_s 0, ease step) or slowly morph. The camera glides from the previous pose to the beat's pose
over move_s (default: the whole beat) - the video never hard-cuts."""
from pathlib import Path

from ..util import StageError, load_json, log, save_json
from . import presets

import re

FPS = 30
# param defaults come from the renderer (single source of truth: src/whatif/world/params.ts)
_PTS = (Path(__file__).resolve().parents[2] / "src/whatif/world/params.ts").read_text()
DEFAULTS = {m.group(1): float(m.group(2)) for m in re.finditer(r"^\s+(\w+): \{ def: ([-\d.e]+),", _PTS, re.M)}
W, H = 1080, 1920
MIN_READ = lambda words: 0.9 + 0.33 * words  # noqa: E731  seconds a caption needs on screen


def _words(s):
    return len([w for w in (s or "").split() if w.strip()])


def build(topic):
    sc = load_json(topic / "scenario.json")
    wd = load_json(topic / "world.json")
    by_id = {b["id"]: b for b in wd["beats"]}
    missing = [b["id"] for b in sc["beats"] if b["id"] not in by_id]
    if missing:
        raise StageError(f"world.json has no entry for beats {missing}")

    fr = lambda s: int(round(s * FPS))  # noqa: E731
    params, camera, captions, hud, flashes, events = {}, [], [], [], [], []
    clock, meters, strips = [], [], []
    t = 0.0
    beats_out = []
    # optional outro: a director-only beat that plays UNDER the end card (loop back to the opening framing)
    beats = list(sc["beats"])
    end_s_cfg = float(wd.get("end_card_s", 3.0)) if sc.get("end_card") else 0.0
    if wd.get("outro"):
        by_id["__outro"] = {**wd["outro"], "dur_s": end_s_cfg}
        beats.append({"id": "__outro"})
    t_end_card = None
    for b in beats:
        if b["id"] == "__outro":
            t_end_card = t
        w = by_id[b["id"]]
        dur = float(w.get("dur_s", b.get("dur_s", 3.0)))
        f0, f1 = fr(t), fr(t + dur)
        beats_out.append({"id": b["id"], "from": f0, "to": f1})
        # params: hold previous value until beat start, then ease to target over ramp_s
        ramp = float(w.get("ramp_s", 1.0))
        ease = w.get("ease", "inout")
        for k, v in (w.get("params") or {}).items():
            if k not in DEFAULTS:
                raise StageError(f"beat {b['id']}: unknown param {k!r} (known: {', '.join(sorted(DEFAULTS))})")
            tr = params.setdefault(k, [[0, DEFAULTS[k], "linear"]])
            if isinstance(v, list):
                # sequence within the beat: [[at_s, value, ramp_s], ...]
                for at, val, r in v:
                    k0 = fr(t + at)
                    tr.append([k0, tr[-1][1] if tr else val, "linear"])
                    tr.append([k0 + max(1, fr(r)), val, "step" if r <= 0 else ease])
                continue
            delay = float((w.get("delay_s") or {}).get(k, 0.0)) if isinstance(w.get("delay_s"), dict) else 0.0
            k0 = fr(t + delay)
            if tr:
                tr.append([k0, tr[-1][1], "linear"])
            r = (w.get("ramp") or {}).get(k, ramp) if isinstance(w.get("ramp"), dict) else ramp
            tr.append([k0 + max(1, fr(r)) if r > 0 else k0 + 1, v, "step" if r <= 0 else ease])
        # camera glide
        cam = w.get("camera")
        # one move, or a list of moves within the beat (each with its own delay_s / move_s)
        for spec in (cam if isinstance(cam, list) else [cam] if cam else []):
            spec = spec if isinstance(spec, dict) else {"preset": spec}
            p = presets.pose(spec)
            move = float(spec.get("move_s", dur))
            delay = float(spec.get("delay_s", 0.0))
            if camera:
                camera.append([fr(t + delay), camera[-1][1], "linear"])
            else:
                camera.append([0, p, "linear"])
            camera.append([fr(t + delay + move), p, spec.get("ease", "inout")])
        # caption
        cap = b.get("caption")
        if cap:
            lead = float(w.get("caption_delay_s", 0.25))
            cf0, cf1 = fr(t + lead), f1 - 4
            if dur < MIN_READ(_words(cap)) - 0.05:
                raise StageError(f"beat {b['id']}: caption needs {MIN_READ(_words(cap)):.1f}s, beat is {dur:.1f}s")
            captions.append({"from": cf0, "to": cf1, "text": cap})
        # HUD (continue = extend the previous item with the same label)
        for h in b.get("hud") or []:
            prev = next((x for x in reversed(hud) if x["label"] == h["label"] and x["to"] == f0), None)
            if h.get("continue") and prev:
                if h["value"] == prev["value"]:
                    prev["to"] = f1
                    if h.get("sub"):
                        prev.setdefault("subs", []).append([f0, h["sub"]])
                    continue
                # same block, new value segment (e.g. counter keeps climbing): no fade between them
                prev["joinNext"] = True
                hud.append({"from": f0, "to": f1, "label": h["label"], "value": h["value"], "sub": h.get("sub") or prev.get("sub"), "joinPrev": True})
                continue
            hud.append({"from": f0, "to": f1, "label": h["label"], "value": h["value"], "sub": h.get("sub")})
        # slowed countdown (scenario): {"n": "5", "s0": 0, "s1": 1, "total_s": 5, "label": "...", "slow": "SLOW MOTION"}
        if b.get("clock"):
            c = b["clock"]
            clock.append({"from": f0, "to": f1, "n": str(c["n"]), "s0": float(c.get("s0", 0)), "s1": float(c.get("s1", c.get("s0", 0))),
                          "total_s": float(c.get("total_s", 5)), "label": c.get("label", ""), "slow": c.get("slow")})
        # milestone ladder (scenario): {"title": "...", "rows": [{"time","text","now"?,"danger"?}]}
        if b.get("meter"):
            meters.append({"from": f0, "to": f1, **b["meter"]})
        # aftermath strip (scenario): {"marks": [...], "at": index, "big"?: text}; merged across consecutive beats
        if b.get("strip"):
            sp = b["strip"]
            prev = strips[-1] if strips and strips[-1]["to"] == f0 and strips[-1]["marks"] == sp["marks"] else None
            if not prev:
                prev = {"from": f0, "to": f1, "marks": sp["marks"], "keys": [], "big": []}
                strips.append(prev)
            prev["to"] = f1
            prev["keys"].append([f0, int(sp["at"])])
            prev["big"].append([f0, sp.get("big") or sp["marks"][int(sp["at"])]])
        if w.get("flash"):
            fl = w["flash"]
            flashes.append({"at": fr(t + fl.get("at_s", 0)), "dur": fr(fl.get("dur_s", 0.5)), "color": fl.get("color", "#ffffff"), "peak": fl.get("peak", 1)})
        for s in w.get("sfx") or []:
            s = s if isinstance(s, dict) else {"kind": s}
            events.append({"t": round(t + float(s.get("at_s", 0)), 3), **{k: v for k, v in s.items() if k != "at_s"}})
        events.append({"t": round(t, 3), "kind": "bed", "bed": w.get("bed", "keep")})
        t += dur

    # end card (loop): same text as the title; solid card, or over the outro beat
    end = sc.get("end_card")
    if t_end_card is not None:
        total, t = t, t_end_card
    else:
        total = t + (end_s_cfg if end else 0.0)
    tl = {
        "fps": FPS, "width": W, "height": H, "durationInFrames": fr(total),
        "kit": wd.get("kit", "city"), "seed": int(wd.get("seed", 7)),
        "params": params, "camera": camera, "captions": captions, "hud": [_hud_out(x) for x in hud],
        "title": {"text": sc["title"], "keyword": sc.get("keyword"), "from": 0, "to": fr(float(wd.get("title_s", 2.6)))},
        "endCard": ({"text": end["text"], "keyword": end.get("keyword"), "sub": end.get("sub"), "from": fr(t), "to": fr(total) + 1,
                     "solid": not wd.get("outro")} if end else None),
        "flashes": flashes,
        "actors": wd.get("actors", []),
        "tags": _tags(sc["beats"], beats_out),
        "beats": beats_out,
        "kitOpts": wd.get("kit_opts"),
        "hudStyle": wd.get("hud_style", "card"),
        "clock": clock, "meters": meters, "strips": strips,
    }
    if end:
        events.append({"t": round(t, 3), "kind": "bed", "bed": "endcard"})
    out = topic / "build"
    save_json(out / "timeline.json", tl)
    save_json(out / "events.json", {"duration": round(total, 3), "events": sorted(events, key=lambda e: e["t"]), "music": wd.get("music")})
    log("timeline", f"{len(sc['beats'])} beats, {total:.1f}s, {len(captions)} captions, {len(hud)} HUD items, {len(camera)} camera keys")
    return tl


def _tags(sc_beats, beats_out):
    """Corner tag per beat (scenario 'tier'), merged across consecutive beats with the same text."""
    out = []
    frames = {b["id"]: b for b in beats_out}
    for b in sc_beats:
        txt = b.get("tier")
        if not txt or b["id"] not in frames:
            continue
        f0, f1 = frames[b["id"]]["from"], frames[b["id"]]["to"]
        if out and out[-1]["text"] == txt and out[-1]["to"] == f0:
            out[-1]["to"] = f1
        else:
            out.append({"from": f0, "to": f1, "text": txt})
    return out


def _hud_out(h):
    out = {k: v for k, v in h.items() if k != "subs"}
    if h.get("subs"):
        out["subs"] = h["subs"]
    return out
